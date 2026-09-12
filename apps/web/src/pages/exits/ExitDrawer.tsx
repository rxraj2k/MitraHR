import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  approveExitCategory,
  deleteExitDocument,
  deleteExitHandover,
  deleteExit,
  getEmployeeExit,
  markExitCleared,
  revokeExitCategoryApproval,
  openExitDocumentFile,
  updateExit,
  updateExitClearanceItem,
  updateExitFeedback,
  uploadExitDocument,
  upsertExitHandover,
} from '../../lib/api';
import {
  APPROVAL_GROUP_CATEGORIES,
  APPROVAL_GROUP_LABELS,
  ApprovalGroup,
  Employee,
  EmployeeExit,
  ExitClearanceCategory,
  ExitDocumentType,
} from '../../types';

type DrawerTab = 'checklist' | 'handover' | 'feedback' | 'documents';
const DRAWER_TABS: TabBarItem<DrawerTab>[] = [
  { key: 'checklist', label: 'Checklist & Approvals', color: 'indigo' },
  { key: 'handover', label: 'Project Handover', color: 'sky' },
  { key: 'feedback', label: 'Exit Interview', color: 'amber' },
  { key: 'documents', label: 'Documents Locker', color: 'teal' },
];

const CATEGORY_LABELS: Record<ExitClearanceCategory, string> = {
  IT_ASSETS: 'IT Assets',
  ACCESS: 'Access',
  FINANCE: 'Finance',
  HR: 'HR',
  ADMIN: 'Admin',
};

const APPROVAL_GROUPS: ApprovalGroup[] = ['IT', 'FINANCE', 'HR_ADMIN'];

const DOCUMENT_TYPE_LABELS: Record<ExitDocumentType, string> = {
  RESIGNATION_ACCEPTANCE: 'Resignation Acceptance',
  RELIEVING_LETTER: 'Relieving Letter',
  EXPERIENCE_CERTIFICATE: 'Experience Certificate',
  NDA: 'NDA',
  OTHER: 'Other',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toDateInput(d?: string | null) {
  return d ? d.slice(0, 10) : '';
}

function toDateTimeInput(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function ChecklistTab({ exit, onChange }: { exit: EmployeeExit; onChange: () => void }) {
  const { token } = useAuth();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyGroup, setBusyGroup] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [detailsForm, setDetailsForm] = useState({
    resignationDate: toDateInput(exit.resignationDate),
    lastWorkingDay: toDateInput(exit.lastWorkingDay),
    reason: exit.reason,
    notes: exit.notes || '',
    accessRevocationAt: toDateTimeInput(exit.accessRevocationAt),
  });
  const [savingDetails, setSavingDetails] = useState(false);

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingDetails(true);
    setError('');
    try {
      await updateExit(token, exit.id, {
        resignationDate: detailsForm.resignationDate || undefined,
        lastWorkingDay: detailsForm.lastWorkingDay || undefined,
        reason: detailsForm.reason || undefined,
        notes: detailsForm.notes,
        accessRevocationAt: detailsForm.accessRevocationAt
          ? new Date(detailsForm.accessRevocationAt).toISOString()
          : undefined,
      });
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDetails(false);
    }
  }

  async function toggleItem(itemId: string, completed: boolean) {
    if (!token) return;
    setBusyItemId(itemId);
    setError('');
    try {
      await updateExitClearanceItem(token, exit.id, itemId, { completed });
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyItemId(null);
    }
  }

  async function approve(group: ApprovalGroup) {
    if (!token) return;
    setBusyGroup(group);
    setError('');
    try {
      await approveExitCategory(token, exit.id, group);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyGroup(null);
    }
  }

  async function revoke(group: ApprovalGroup) {
    if (!token) return;
    if (!confirm(`Revoke the ${APPROVAL_GROUP_LABELS[group]} sign-off?`)) return;
    setBusyGroup(group);
    setError('');
    try {
      await revokeCategoryApprovalCompat(group);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyGroup(null);
    }
  }

  async function revokeCategoryApprovalCompat(group: ApprovalGroup) {
    await revokeExitCategoryApproval(token as string, exit.id, group);
  }

  const locked = exit.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={saveDetails} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Resignation Date</label>
          <input
            type="date"
            disabled={locked}
            value={detailsForm.resignationDate}
            onChange={(e) => setDetailsForm({ ...detailsForm, resignationDate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Last Working Day</label>
          <input
            type="date"
            disabled={locked}
            value={detailsForm.lastWorkingDay}
            onChange={(e) => setDetailsForm({ ...detailsForm, lastWorkingDay: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Reason</label>
          <input
            disabled={locked}
            value={detailsForm.reason}
            onChange={(e) => setDetailsForm({ ...detailsForm, reason: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Access Revocation Date/Time</label>
          <input
            type="datetime-local"
            disabled={locked}
            value={detailsForm.accessRevocationAt}
            onChange={(e) => setDetailsForm({ ...detailsForm, accessRevocationAt: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            A reminder only — MitraHR has no Google Workspace/Slack/VPN integration to revoke access itself.
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Notes</label>
          <input
            disabled={locked}
            value={detailsForm.notes}
            onChange={(e) => setDetailsForm({ ...detailsForm, notes: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          />
        </div>
        {!locked && (
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingDetails}
              className="rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              {savingDetails ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        )}
      </form>

      {APPROVAL_GROUPS.map((group) => {
        const categories = APPROVAL_GROUP_CATEGORIES[group];
        const items = exit.items.filter((i) => categories.includes(i.category));
        const approval = exit.approvals.find((a) => a.group === group);
        const allDone = items.every((i) => i.completed);
        return (
          <div key={group} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span className="font-semibold text-sm text-slate-700">{APPROVAL_GROUP_LABELS[group]}</span>
              {approval ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Approved by {approval.approvedBy} · {formatDate(approval.approvedAt)}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Not yet approved</span>
              )}
            </div>
            <div className="p-4 space-y-2">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                    item.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={locked || busyItemId === item.id || !!approval}
                    onChange={(e) => toggleItem(item.id, e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className={item.completed ? 'text-slate-500 line-through' : 'text-slate-700'}>{item.label}</span>
                    <span className="ml-2 text-xs text-slate-400">({CATEGORY_LABELS[item.category]})</span>
                    {item.category === 'IT_ASSETS' && exit.pendingAssetCount > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {exit.pendingAssetCount} asset{exit.pendingAssetCount === 1 ? '' : 's'} still assigned
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {!locked && (
                <div className="pt-1">
                  {approval ? (
                    <button
                      onClick={() => revoke(group)}
                      disabled={busyGroup === group}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Revoke sign-off
                    </button>
                  ) : (
                    <button
                      onClick={() => approve(group)}
                      disabled={!allDone || busyGroup === group}
                      title={allDone ? '' : 'Complete every item in this section first'}
                      className="rounded-lg bg-slate-800 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-40"
                    >
                      {busyGroup === group ? 'Approving...' : `Approve ${APPROVAL_GROUP_LABELS[group]}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HandoverTab({ exit, employees, onChange }: { exit: EmployeeExit; employees: Employee[]; onChange: () => void }) {
  const { token } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { primarySuccessorId: string; secondarySuccessorId: string; notes: string; confirmed: boolean }>>({});

  const candidates = employees.filter((e) => e.id !== exit.employeeId && e.status === 'ACTIVE');
  const activeProjects = exit.activeProjects || [];

  function draftFor(projectId: string) {
    if (drafts[projectId]) return drafts[projectId];
    const existing = exit.handovers.find((h) => h.projectId === projectId);
    return {
      primarySuccessorId: existing?.primarySuccessorId || '',
      secondarySuccessorId: existing?.secondarySuccessorId || '',
      notes: existing?.notes || '',
      confirmed: existing?.confirmed || false,
    };
  }

  function setDraft(projectId: string, patch: Partial<{ primarySuccessorId: string; secondarySuccessorId: string; notes: string; confirmed: boolean }>) {
    setDrafts((d) => ({ ...d, [projectId]: { ...draftFor(projectId), ...patch } }));
  }

  async function save(projectId: string) {
    if (!token) return;
    setSavingId(projectId);
    setError('');
    try {
      const draft = draftFor(projectId);
      await upsertExitHandover(token, exit.id, {
        projectId,
        primarySuccessorId: draft.primarySuccessorId || undefined,
        secondarySuccessorId: draft.secondarySuccessorId || undefined,
        notes: draft.notes || undefined,
        confirmed: draft.confirmed,
      });
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function remove(handoverId: string) {
    if (!token) return;
    if (!confirm('Remove this handover assignment?')) return;
    await deleteExitHandover(token, exit.id, handoverId);
    onChange();
  }

  if (activeProjects.length === 0) {
    return <p className="text-sm text-slate-500">No active project assignments to hand over.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      {activeProjects.map((pa) => {
        const draft = draftFor(pa.projectId);
        const existing = exit.handovers.find((h) => h.projectId === pa.projectId);
        return (
          <div key={pa.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-sm text-slate-800">{pa.project.name}</div>
                <div className="text-xs text-slate-500">{pa.project.client?.name || '—'}</div>
              </div>
              {existing?.confirmed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Confirmed</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Primary Successor</label>
                <select
                  value={draft.primarySuccessorId}
                  onChange={(e) => setDraft(pa.projectId, { primarySuccessorId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Secondary Successor</label>
                <select
                  value={draft.secondarySuccessorId}
                  onChange={(e) => setDraft(pa.projectId, { secondarySuccessorId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Handover Notes</label>
                <textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft(pa.projectId, { notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={draft.confirmed}
                  onChange={(e) => setDraft(pa.projectId, { confirmed: e.target.checked })}
                />
                Handover confirmed complete
              </label>
              <div className="flex items-center gap-3">
                {existing && (
                  <button onClick={() => remove(existing.id)} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                )}
                <button
                  onClick={() => save(pa.projectId)}
                  disabled={savingId === pa.projectId}
                  className="rounded-lg bg-mitra-accentFrom text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                >
                  {savingId === pa.projectId ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeedbackTab({ exit, onChange }: { exit: EmployeeExit; onChange: () => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    interviewCompletedAt: toDateInput(exit.interviewCompletedAt),
    cultureScore: exit.cultureScore ? String(exit.cultureScore) : '',
    managementFeedback: exit.managementFeedback || '',
    rehireEligible: exit.rehireEligible === null || exit.rehireEligible === undefined ? '' : String(exit.rehireEligible),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await updateExitFeedback(token, exit.id, {
        interviewCompletedAt: form.interviewCompletedAt || undefined,
        cultureScore: form.cultureScore ? Number(form.cultureScore) : undefined,
        managementFeedback: form.managementFeedback || undefined,
        rehireEligible: form.rehireEligible === '' ? undefined : form.rehireEligible === 'true',
      });
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="text-xs text-slate-500 mb-1">Resignation Reason</div>
        <div className="text-sm text-slate-700">{exit.reason}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Interview Completed On</label>
          <input
            type="date"
            value={form.interviewCompletedAt}
            onChange={(e) => setForm({ ...form, interviewCompletedAt: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Team Culture Score (1-5)</label>
          <select
            value={form.cultureScore}
            onChange={(e) => setForm({ ...form, cultureScore: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Management Feedback</label>
          <textarea
            rows={4}
            value={form.managementFeedback}
            onChange={(e) => setForm({ ...form, managementFeedback: e.target.value })}
            placeholder="Notes from the exit interview — feedback on management, team culture, reasons behind the departure..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Re-hire Eligibility</label>
          <select
            value={form.rehireEligible}
            onChange={(e) => setForm({ ...form, rehireEligible: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Not decided</option>
            <option value="true">Eligible for re-hire</option>
            <option value="false">Not eligible for re-hire</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Feedback'}
      </button>
    </form>
  );
}

function DocumentsTab({ exit, onChange }: { exit: EmployeeExit; onChange: () => void }) {
  const { token } = useAuth();
  const [docType, setDocType] = useState<ExitDocumentType>('RESIGNATION_ACCEPTANCE');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!token || !file) return;
    setUploading(true);
    setError('');
    try {
      await uploadExitDocument(token, exit.id, docType, file);
      setFile(null);
      setFileInputKey((k) => k + 1);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string, fileName: string) {
    if (!token) return;
    if (!confirm(`Delete "${fileName}"? This can't be undone.`)) return;
    await deleteExitDocument(token, exit.id, docId);
    onChange();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        {error && <div className="md:col-span-3 text-sm text-red-600">{error}</div>}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Document Type</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as ExitDocumentType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {(Object.keys(DOCUMENT_TYPE_LABELS) as ExitDocumentType[]).map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">File</label>
          <input
            key={fileInputKey}
            required
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {exit.documents.length === 0 ? (
        <p className="text-sm text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {exit.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-700">{DOCUMENT_TYPE_LABELS[doc.docType]}</div>
                <div className="text-xs text-slate-400">
                  {doc.fileName} · {formatDate(doc.uploadedAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => token && openExitDocumentFile(token, exit.id, doc.id)}
                  className="text-xs text-mitra-accentFrom hover:underline"
                >
                  View
                </button>
                <button onClick={() => handleDelete(doc.id, doc.fileName)} className="text-xs text-red-500 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExitDrawer({
  exitId,
  employees,
  onClose,
  onChanged,
}: {
  exitId: string;
  employees: Employee[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [exit, setExit] = useState<EmployeeExit | null>(null);
  const [tab, setTab] = useState<DrawerTab>('checklist');
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!token) return;
    const data = await getEmployeeExit(token, exitId);
    setExit(data);
  }

  useEffect(() => {
    load();
    setTab('checklist');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitId, token]);

  async function refresh() {
    await load();
    onChanged();
  }

  async function handleClear() {
    if (!token || !exit) return;
    if (!confirm(`Mark ${exit.employee.fullName}'s clearance complete? This moves them to Inactive.`)) return;
    setClearing(true);
    setError('');
    try {
      await markExitCleared(token, exit.id);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleCancelExit() {
    if (!token || !exit) return;
    if (!confirm(`Cancel the exit process for ${exit.employee.fullName}?`)) return;
    await deleteExit(token, exit.id);
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full shadow-xl overflow-y-auto">
        {!exit ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {exit.employee.photoUrl ? (
                    <img src={exit.employee.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                      {exit.employee.fullName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-800">{exit.employee.fullName}</div>
                    <div className="text-xs text-slate-500">
                      {exit.employee.designation?.name || '—'}
                      {exit.employee.department?.name ? ` · ${exit.employee.department.name}` : ''}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
                  Close ✕
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                <span>Last working day: {formatDate(exit.lastWorkingDay)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    exit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {exit.status === 'COMPLETED' ? `Cleared ${formatDate(exit.completedAt)}` : 'In Progress'}
                </span>
              </div>
              {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
              {exit.status !== 'COMPLETED' && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleClear}
                    disabled={clearing}
                    className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                  >
                    {clearing ? 'Clearing...' : 'Mark Fully Cleared'}
                  </button>
                  <button onClick={handleCancelExit} className="text-xs text-red-500 hover:underline">
                    Cancel exit
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 pt-4">
              <TabBar tabs={DRAWER_TABS} active={tab} onChange={setTab} />
            </div>

            <div className="px-6 pb-8 flex-1">
              {tab === 'checklist' && <ChecklistTab exit={exit} onChange={refresh} />}
              {tab === 'handover' && <HandoverTab exit={exit} employees={employees} onChange={refresh} />}
              {tab === 'feedback' && <FeedbackTab exit={exit} onChange={refresh} />}
              {tab === 'documents' && <DocumentsTab exit={exit} onChange={refresh} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
