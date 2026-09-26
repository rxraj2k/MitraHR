import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { downloadBackup, getAdminSettings, getSystemHealth, restoreBackup, updateAdminSettings } from '../../lib/api';
import { AdminSettings, SystemHealth } from '../../types';
import { AlertTriangleIcon, DatabaseIcon, DownloadIcon, UploadIcon, UsersIcon, ClipboardListIcon } from '../icons';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';
import AdminLiveActivity from './AdminLiveActivity';

function formatBytes(bytes: number | null): string {
  if (bytes == null) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Data & System Health. The metrics below are all genuinely queried (see
// AdminService.getSystemHealth). Backup/Restore is now a real, full
// database file (see AdminService's Backup & Restore comment for why that
// replaced the old partial JSON export of 9 tables). Live User Activity
// (below) is real per-login session tracking (see UserSession's model
// comment) -- not the old stateless-JWT limitation this used to note;
// sessions are now revocable, and a restore below actually signs everyone
// out (see handleRestore) since it wipes the sessions table too.
export default function AdminSystemHealth() {
  const { token, logout } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreError, setRestoreError] = useState('');
  const [restoreDone, setRestoreDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    if (!token) return;
    Promise.all([getSystemHealth(token), getAdminSettings(token)])
      .then(([h, s]) => {
        setHealth(h);
        setSettings(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleBackup() {
    if (!token) return;
    setBackingUp(true);
    setError('');
    try {
      await downloadBackup(token);
      load();
    } catch (err: any) {
      setError(err.message || 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleScheduleChange(schedule: string) {
    if (!token) return;
    setSavingSchedule(true);
    try {
      const updated = await updateAdminSettings(token, { backupSchedule: schedule as AdminSettings['backupSchedule'] });
      setSettings(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleRestore() {
    if (!token || !restoreFile) return;
    const confirmed = confirm(
      `This will REPLACE your entire live database with the contents of "${restoreFile.name}". ` +
        `Everything created or changed since that backup was taken will be permanently lost, and everyone ` +
        `(including you) will be signed out immediately afterward. This cannot be undone. Continue?`,
    );
    if (!confirmed) return;

    setRestoring(true);
    setRestoreError('');
    setRestoreProgress(0);
    try {
      await restoreBackup(token, restoreFile, setRestoreProgress);
      setRestoreDone(true);
      // The restore just replaced the sessions table too, so this session
      // no longer exists on the server -- sign out locally right away
      // rather than waiting for the next API call to 401.
      setTimeout(() => logout(), 2500);
    } catch (err: any) {
      setRestoreError(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading system health...</p>;
  if (!health || !settings) return <div className="text-sm text-red-600">{error || 'Could not load system health.'}</div>;

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80 flex items-center gap-1.5"><DatabaseIcon className="w-3.5 h-3.5" /> Database Storage</p>
          <p className="text-2xl font-bold mt-1">{formatBytes(health.dbSizeBytes)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> Employees</p>
          <p className="text-2xl font-bold mt-1">{health.employeeCount}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-400 to-blue-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> Admin Accounts</p>
          <p className="text-2xl font-bold mt-1">{health.adminCount}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{health.recentLogins24h} logged in, last 24h</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <p className="text-[11px] font-semibold uppercase opacity-80 flex items-center gap-1.5"><ClipboardListIcon className="w-3.5 h-3.5" /> Audit Log Entries</p>
          <p className="text-2xl font-bold mt-1">{health.auditLogCount}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Data Export & Backups</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Downloads the real, complete database file, exactly as it exists right now — every table, not a partial
          export. The schedule below is saved as intent for automated backups — there's no scheduler running it yet,
          so use the button for an actual backup today.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleBackup} disabled={backingUp} className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}>
            <DownloadIcon className="w-4 h-4" />
            {backingUp ? 'Downloading...' : 'Download Full Backup'}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Schedule (not yet automated):</label>
            <select
              value={settings.backupSchedule}
              onChange={(e) => handleScheduleChange(e.target.value)}
              disabled={savingSchedule}
              className="rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="NONE">None</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">Last backup generated: {formatDateTime(health.lastBackupAt)}</p>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Restore from Backup</h3>
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 mb-3">
            <AlertTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This replaces the entire live database with the uploaded file. Anything created or changed since that
              backup was taken will be permanently lost, and everyone will be signed out immediately afterward. Only
              restore a backup downloaded from this same installation.
            </span>
          </div>

          {restoreDone ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Restore complete. Signing you out — please log back in.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                className="hidden"
                onChange={(e) => {
                  setRestoreError('');
                  setRestoreFile(e.target.files?.[0] || null);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                <UploadIcon className="w-4 h-4" />
                {restoreFile ? restoreFile.name : 'Choose Backup File (.db)...'}
              </button>
              {restoreFile && (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoring}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {restoring ? `Restoring... ${restoreProgress}%` : 'Restore This Backup'}
                </button>
              )}
            </div>
          )}
          {restoreError && <div className="text-xs text-red-600 mt-2">{restoreError}</div>}
        </div>
      </div>

      <AdminLiveActivity />
    </div>
  );
}
