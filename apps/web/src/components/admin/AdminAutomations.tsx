import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminSettings, updateAdminSettings } from '../../lib/api';
import { AdminSettings } from '../../types';
import { MailIcon, PencilIcon } from '../icons';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-mitra-accentFrom' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  );
}

function ChannelPill({ channel }: { channel: 'Email' | 'In-App' }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
        channel === 'Email'
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {channel}
    </span>
  );
}

// Email & Automations. Only the 6-Month Appraisal trigger is a real email
// (MailService/SMTP) -- Asset Assignment and Document Expiry are today's
// in-app notification bell only, no email flow exists for them yet. Each
// row is labeled with its real channel rather than implying all three send
// email, and the toggles genuinely gate their trigger (see
// AppraisalsService.checkAppraisalCycles, AssetsService.assign,
// DailyJobsService.flagExpiringDocuments).
export default function AdminAutomations() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');

  useEffect(() => {
    if (!token) return;
    getAdminSettings(token)
      .then((s) => {
        setSettings(s);
        setSubjectDraft(s.appraisalEmailSubjectTemplate || '');
        setBodyDraft(s.appraisalEmailBodyTemplate || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function save(patch: Partial<AdminSettings>) {
    if (!token || !settings) return;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    setError('');
    try {
      const updated = await updateAdminSettings(token, patch);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    await save({
      appraisalEmailSubjectTemplate: subjectDraft || undefined,
      appraisalEmailBodyTemplate: bodyDraft || undefined,
    });
    setEditingTemplate(false);
  }

  function resetTemplate() {
    setSubjectDraft('');
    setBodyDraft('');
    save({ appraisalEmailSubjectTemplate: undefined, appraisalEmailBodyTemplate: undefined });
  }

  if (loading) return <p className="text-sm text-slate-400">Loading automation settings...</p>;
  if (!settings) return <div className="text-sm text-red-600">{error || 'Could not load automation settings.'}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MailIcon className="w-4 h-4 text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Automated Triggers</h2>
          </div>
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-200">6-Month Appraisal Reminder</p>
                <ChannelPill channel="Email" />
              </div>
              <p className="text-[11px] text-slate-400">Sent 7 days before each employee's semi-annual review is due.</p>
            </div>
            <ToggleSwitch checked={settings.appraisalEmailEnabled} disabled={saving} onChange={() => save({ appraisalEmailEnabled: !settings.appraisalEmailEnabled })} />
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-200">Asset Assignment Notice</p>
                <ChannelPill channel="In-App" />
              </div>
              <p className="text-[11px] text-slate-400">Notifies an employee when an asset is assigned to them.</p>
            </div>
            <ToggleSwitch checked={settings.assetAssignmentNoticeEnabled} disabled={saving} onChange={() => save({ assetAssignmentNoticeEnabled: !settings.assetAssignmentNoticeEnabled })} />
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-700 dark:text-slate-200">Document Expiry Alert</p>
                <ChannelPill channel="In-App" />
              </div>
              <p className="text-[11px] text-slate-400">Flags employee documents expiring in 7 / 3 / 1 days, or today.</p>
            </div>
            <ToggleSwitch checked={settings.documentExpiryAlertEnabled} disabled={saving} onChange={() => save({ documentExpiryAlertEnabled: !settings.documentExpiryAlertEnabled })} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <PencilIcon className="w-4 h-4 text-sky-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Email Template</h2>
          </div>
          {!editingTemplate && (
            <button onClick={() => setEditingTemplate(true)} className="text-xs font-semibold text-mitra-accentFrom hover:underline">
              Edit
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Only the 6-Month Appraisal email is customizable today — Asset Assignment and Document Expiry are in-app only,
          with nothing to template yet.
        </p>

        {editingTemplate ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Subject line</label>
              <input
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                placeholder="Action Required: Your {{cycleLabel}} Form Is Ready"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Body intro</label>
              <textarea
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={4}
                placeholder="Congratulations on reaching your {{cycleLabel}} milestone! Please complete your Self-Appraisal form by {{dueDate}}."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Available tokens: <code className="bg-slate-100 dark:bg-slate-800 rounded px-1">{'{{firstName}}'}</code>{' '}
              <code className="bg-slate-100 dark:bg-slate-800 rounded px-1">{'{{cycleLabel}}'}</code>{' '}
              <code className="bg-slate-100 dark:bg-slate-800 rounded px-1">{'{{dueDate}}'}</code>. Leave blank to keep the
              default copy.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={resetTemplate} className="text-xs font-medium text-slate-500 px-3 py-2">
                Reset to default
              </button>
              <button onClick={() => setEditingTemplate(false)} className="text-xs font-medium text-slate-500 px-3 py-2">
                Cancel
              </button>
              <button onClick={saveTemplate} disabled={saving} className={`text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}>
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {settings.appraisalEmailSubjectTemplate || 'Action Required: Your {{cycleLabel}} Form Is Ready (default)'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {settings.appraisalEmailBodyTemplate ||
                "Congratulations on reaching your {{cycleLabel}} milestone at OffshoreMitra! ... (default copy)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
