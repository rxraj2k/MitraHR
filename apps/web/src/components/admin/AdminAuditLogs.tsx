import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { exportAuditLogsCsv, getAuditLogs } from '../../lib/api';
import { AuditLogEntry, AuditSeverity } from '../../types';
import { ClipboardListIcon, DownloadIcon, SearchIcon } from '../icons';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';

const MODULES = ['HR', 'ASSETS', 'SECURITY', 'SYSTEM'] as const;
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

const SEVERITY_BADGE: Record<AuditSeverity, string> = {
  INFO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  CRITICAL: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// System Audit Logs. Deliberately narrow by design -- see AuditLog model
// comment in schema.prisma: this records a handful of high-value sensitive
// actions (compensation changes, asset reassignment, admin invites/role
// changes), not an interceptor logging every mutation in the app.
export default function AdminAuditLogs() {
  const { token } = useAuth();
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    getAuditLogs(token, { user: user || undefined, module: module || undefined, action: action || undefined, from: from || undefined, to: to || undefined })
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const { csv } = await exportAuditLogsCsv(token, { user: user || undefined, module: module || undefined, action: action || undefined, from: from || undefined, to: to || undefined });
      downloadCsv(csv, `mitrahr-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err: any) {
      setError(err.message || 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">User</label>
            <div className="relative">
              <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Name or email"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Module</label>
            <select value={module} onChange={(e) => setModule(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm">
              <option value="">All</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm">
              <option value="">All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm" />
          </div>
          <button onClick={load} className={`text-sm font-semibold px-4 py-2 rounded-lg ${PRIMARY_BUTTON_3D}`}>
            Filter
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 disabled:opacity-50"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export Audit CSV'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {error && <div className="text-sm text-red-600 px-5 py-3">{error}</div>}
        {loading ? (
          <p className="text-sm text-slate-500 px-5 py-6">Loading...</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <ClipboardListIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No audit events match this view.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Module</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">IP Address</th>
                <th className="px-5 py-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatTimestamp(r.createdAt)}</td>
                  <td className="px-3 py-3">
                    <p className="text-slate-700 dark:text-slate-200 font-medium">{r.userName}</p>
                    <p className="text-[11px] text-slate-400">{r.userEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.module}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.action}</td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-md">{r.description}</td>
                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{r.ipAddress || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex text-[11px] font-medium rounded-full px-2.5 py-1 ${SEVERITY_BADGE[r.severity]}`}>
                      {r.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
