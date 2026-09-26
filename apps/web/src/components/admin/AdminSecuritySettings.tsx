import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminSettings, updateAdminSettings } from '../../lib/api';
import { AdminSettings } from '../../types';
import { AlertTriangleIcon, KeyIcon, LockIcon } from '../icons';
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

// Security & Authentication. IMPORTANT: everything on this tab is POLICY,
// saved for a future enforcement pass -- there is no MFA challenge flow, no
// password-expiry check at login, no session-idle clock, and no IP-filter
// guard anywhere in the app yet. The banner and per-control note say so
// plainly rather than letting a saved toggle imply it's already live.
export default function AdminSecuritySettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAdminSettings(token)
      .then(setSettings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function save(patch: Partial<AdminSettings>) {
    if (!token || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    setError('');
    setSaved(false);
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

  if (loading) {
    return <p className="text-sm text-slate-400">Loading security settings...</p>;
  }
  if (!settings) {
    return <div className="text-sm text-red-600">{error || 'Could not load security settings.'}</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <AlertTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          These are policy settings, saved for reference and a future enforcement rollout. MitraHR does not yet have an
          MFA challenge flow, a password-expiry check, a session-timeout clock, or IP-based request filtering — nothing
          here changes login behavior today.
        </p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <LockIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Authentication & SSO</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-200">Enforce 2FA / MFA for Admins</p>
              <p className="text-[11px] text-slate-400">Not yet enforced — no MFA challenge exists in the login flow.</p>
            </div>
            <ToggleSwitch
              checked={settings.enforceMfaForAdmins}
              disabled={saving}
              onChange={() => save({ enforceMfaForAdmins: !settings.enforceMfaForAdmins })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-200">Password Expiry</p>
              <p className="text-[11px] text-slate-400">Not yet enforced at login.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={settings.passwordExpiryDays}
                onChange={(e) => setSettings({ ...settings, passwordExpiryDays: Number(e.target.value) })}
                onBlur={() => save({ passwordExpiryDays: settings.passwordExpiryDays })}
                className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm text-right"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-200">Session Idle Timeout</p>
              <p className="text-[11px] text-slate-400">Drives the Away status on Data & System Health → Live User Activity. Doesn't force a logout yet.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1440}
                value={settings.sessionIdleTimeoutMin}
                onChange={(e) => setSettings({ ...settings, sessionIdleTimeoutMin: Number(e.target.value) })}
                onBlur={() => save({ sessionIdleTimeoutMin: settings.sessionIdleTimeoutMin })}
                className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-sm text-right"
              />
              <span className="text-xs text-slate-500">minutes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <KeyIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">IP Whitelisting</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Restrict admin dashboard access to authorized office IP ranges. One IP or CIDR range per line. Not yet enforced
          by any request guard.
        </p>
        <textarea
          value={settings.ipWhitelist}
          onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value })}
          onBlur={() => save({ ipWhitelist: settings.ipWhitelist })}
          rows={4}
          placeholder={'e.g.\n203.0.113.0/24\n198.51.100.12'}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm font-mono"
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
          <button
            onClick={() => save({ ipWhitelist: settings.ipWhitelist })}
            disabled={saving}
            className={`text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
          >
            {saving ? 'Saving...' : 'Save IP Whitelist'}
          </button>
        </div>
      </div>
    </div>
  );
}
