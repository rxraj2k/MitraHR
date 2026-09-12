import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  deleteExit,
  getEmployeeExits,
  getEmployees,
  initiateExit,
  markExitCleared,
  updateExitClearanceItem,
} from '../../lib/api';
import { Employee, EmployeeExit, ExitClearanceCategory } from '../../types';

type Tab = 'IN_PROGRESS' | 'COMPLETED';
const TABS: TabBarItem<Tab>[] = [
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'amber' },
  { key: 'COMPLETED', label: 'Completed', color: 'emerald' },
];

const CATEGORY_LABELS: Record<ExitClearanceCategory, string> = {
  IT_ASSETS: 'IT Assets',
  ACCESS: 'Access',
  FINANCE: 'Finance',
  HR: 'HR',
  ADMIN: 'Admin',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface InitiateFormState {
  employeeId: string;
  lastWorkingDay: string;
  reason: string;
  notes: string;
}

const EMPTY_FORM: InitiateFormState = { employeeId: '', lastWorkingDay: '', reason: '', notes: '' };

function ExitCard({ exit, onChange }: { exit: EmployeeExit; onChange: () => void }) {
  const { token } = useAuth();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const completedCount = exit.items.filter((i) => i.completed).length;
  const allDone = completedCount === exit.items.length;

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

  async function handleClear() {
    if (!token) return;
    if (!confirm(`Mark ${exit.employee.fullName}'s clearance complete? This moves them to Inactive.`)) return;
    setClearing(true);
    setError('');
    try {
      await markExitCleared(token, exit.id);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    if (!confirm(`Cancel the exit process for ${exit.employee.fullName}?`)) return;
    await deleteExit(token, exit.id);
    onChange();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {exit.employee.photoUrl ? (
            <img src={exit.employee.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-medium">
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
        <div className="text-right text-xs text-slate-500">
          <div>Last working day: {formatDate(exit.lastWorkingDay)}</div>
          <div className="mt-0.5">
            {exit.status === 'COMPLETED' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Cleared {formatDate(exit.completedAt)}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {completedCount}/{exit.items.length} items done
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-600 mb-4">
        <span className="text-slate-400">Reason: </span>
        {exit.reason}
        {exit.notes && <div className="text-xs text-slate-400 mt-1">{exit.notes}</div>}
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="space-y-2 mb-4">
        {exit.items.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
              item.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'
            }`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={exit.status === 'COMPLETED' || busyItemId === item.id}
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
      </div>

      {exit.status !== 'COMPLETED' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            disabled={!allDone || clearing}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-40"
            title={allDone ? '' : 'Complete every checklist item first'}
          >
            {clearing ? 'Clearing...' : 'Mark Fully Cleared'}
          </button>
          <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
            Cancel exit
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExitClearance() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('IN_PROGRESS');
  const [exits, setExits] = useState<EmployeeExit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInitiate, setShowInitiate] = useState(false);
  const [form, setForm] = useState<InitiateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [ex, emp] = await Promise.all([getEmployeeExits(token), getEmployees(token)]);
      setExits(ex);
      setEmployees(emp);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const exitingEmployeeIds = new Set(exits.filter((e) => e.status === 'IN_PROGRESS').map((e) => e.employeeId));
  const eligibleEmployees = employees.filter((e) => e.status === 'ACTIVE' && !exitingEmployeeIds.has(e.id));

  async function handleInitiate(e: FormEvent) {
    e.preventDefault();
    if (!token || !form.employeeId || !form.lastWorkingDay || !form.reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      await initiateExit(token, {
        employeeId: form.employeeId,
        lastWorkingDay: form.lastWorkingDay,
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowInitiate(false);
      setTab('IN_PROGRESS');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = exits.filter((e) => e.status === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Exit &amp; Clearance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Run offboarding end to end — checklist, asset return, and final clearance.
          </p>
        </div>
        <button
          onClick={() => setShowInitiate((v) => !v)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          {showInitiate ? 'Cancel' : '+ Initiate Exit'}
        </button>
      </div>

      {showInitiate && (
        <form onSubmit={handleInitiate} className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {error && <div className="md:col-span-4 text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select employee...</option>
              {eligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Last Working Day</label>
            <input
              required
              type="date"
              value={form.lastWorkingDay}
              onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Reason</label>
            <input
              required
              placeholder="e.g. Resignation, End of contract"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Starting...' : 'Initiate Exit'}
            </button>
          </div>
        </form>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-slate-500 text-sm">
            {tab === 'IN_PROGRESS' ? 'No exits currently in progress.' : 'No completed exits yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((exit) => (
            <ExitCard key={exit.id} exit={exit} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}
