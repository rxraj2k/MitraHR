import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ExitDrawer from './ExitDrawer';
import { getEmployeeExits, getEmployees, initiateExit } from '../../lib/api';
import { APPROVAL_GROUP_CATEGORIES, ApprovalGroup, Employee, EmployeeExit } from '../../types';
import { CheckCircleIcon, ClockIcon, FileTextIcon, LaptopIcon } from '../../components/icons';
import MetricTile from '../../components/MetricTile';
import Progress3DBar from '../../components/Progress3DBar';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';

const APPROVAL_GROUPS: ApprovalGroup[] = ['IT', 'FINANCE', 'HR_ADMIN'];
const GROUP_DOT_LABEL: Record<ApprovalGroup, string> = { IT: 'IT', FINANCE: 'Fin', HR_ADMIN: 'HR' };

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function groupStatus(exit: EmployeeExit, group: ApprovalGroup): 'approved' | 'ready' | 'pending' {
  if (exit.approvals.some((a) => a.group === group)) return 'approved';
  const categories = APPROVAL_GROUP_CATEGORIES[group];
  const items = exit.items.filter((i) => categories.includes(i.category));
  return items.length > 0 && items.every((i) => i.completed) ? 'ready' : 'pending';
}

const DOT_CLASS: Record<'approved' | 'ready' | 'pending', string> = {
  approved: 'bg-emerald-500',
  ready: 'bg-amber-400',
  pending: 'bg-slate-300',
};

function ClearanceStepper({ exit }: { exit: EmployeeExit }) {
  const completedItems = exit.items.filter((i) => i.completed).length;
  const total = exit.items.length;
  const pct = total === 0 ? 0 : Math.round((completedItems / total) * 100);
  return (
    <div className="min-w-[132px]">
      <div className="flex items-center gap-1.5 mb-1.5">
        {APPROVAL_GROUPS.map((g) => (
          <span
            key={g}
            title={`${GROUP_DOT_LABEL[g]}: ${groupStatus(exit, g)}`}
            className={`w-2.5 h-2.5 rounded-full ${DOT_CLASS[groupStatus(exit, g)]}`}
          />
        ))}
        <span className="text-xs text-slate-500 ml-1">
          {completedItems}/{total}
        </span>
      </div>
      {/* Small completion bar so overall clearance progress reads at a
          glance, alongside the group sign-off dots above. */}
      <Progress3DBar
        percent={pct}
        height="h-1.5"
        fillClassName={pct === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo'}
      />
    </div>
  );
}

interface InitiateFormState {
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  notes: string;
  accessRevocationAt: string;
}

const EMPTY_FORM: InitiateFormState = {
  employeeId: '',
  resignationDate: '',
  lastWorkingDay: '',
  reason: '',
  notes: '',
  accessRevocationAt: '',
};

function InitiateModal({
  employees,
  eligibleIds,
  onClose,
  onCreated,
}: {
  employees: Employee[];
  eligibleIds: Set<string>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState<InitiateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const eligible = employees.filter((e) => e.status === 'ACTIVE' && eligibleIds.has(e.id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !form.employeeId || !form.resignationDate || !form.lastWorkingDay || !form.reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      await initiateExit(token, {
        employeeId: form.employeeId,
        resignationDate: form.resignationDate,
        lastWorkingDay: form.lastWorkingDay,
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
        accessRevocationAt: form.accessRevocationAt ? new Date(form.accessRevocationAt).toISOString() : undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Initiate Exit</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {error && <div className="md:col-span-2 text-sm text-red-600">{error}</div>}
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select employee...</option>
              {eligible.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Resignation Date</label>
            <input
              required
              type="date"
              value={form.resignationDate}
              onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
          <div>
            <label className="block text-xs text-slate-500 mb-1">Access Revocation Date/Time (optional)</label>
            <input
              type="datetime-local"
              value={form.accessRevocationAt}
              onChange={(e) => setForm({ ...form, accessRevocationAt: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Starting...' : 'Initiate Exit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Static class lookup (never build the class string dynamically) — Tailwind's
// JIT compiler only picks up classes it can see literally in source, same
// pattern as the Home dashboard's tinted summary cards.
function KpiCard({
  label,
  value,
  icon,
  theme,
}: {
  label: string;
  value: number;
  icon: Parameters<typeof MetricTile>[0]['icon'];
  theme: (typeof TILE_THEMES)[number];
}) {
  return (
    <div className={tileWrapperClass(theme)}>
      <MetricTile icon={icon} label={label} value={value} />
    </div>
  );
}

export default function ExitClearance() {
  const { token } = useAuth();
  const [exits, setExits] = useState<EmployeeExit[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [showInitiate, setShowInitiate] = useState(false);
  const [openExitId, setOpenExitId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    try {
      const [ex, emp] = await Promise.all([getEmployeeExits(token), getEmployees(token)]);
      setExits(ex);
      setEmployees(emp);
    } catch (err: any) {
      // Surface fetch failures instead of silently leaving exits/employees
      // empty — an empty state and a failed load look identical otherwise.
      setLoadError(err?.message || 'Failed to load exits data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const eligibleIds = useMemo(() => {
    const exiting = new Set(exits.filter((e) => e.status === 'IN_PROGRESS').map((e) => e.employeeId));
    return new Set(employees.filter((e) => e.status === 'ACTIVE' && !exiting.has(e.id)).map((e) => e.id));
  }, [exits, employees]);

  const departments = useMemo(() => {
    const names = new Set<string>();
    exits.forEach((e) => e.employee.department?.name && names.add(e.employee.department.name));
    return Array.from(names).sort();
  }, [exits]);

  const now = new Date();
  const kpis = useMemo(() => {
    const activeExits = exits.filter((e) => e.status === 'IN_PROGRESS');
    const pendingIT = activeExits.filter((e) => groupStatus(e, 'IT') !== 'approved').length;
    const pendingFinance = activeExits.filter((e) => groupStatus(e, 'FINANCE') !== 'approved').length;
    const completedThisMonth = exits.filter(
      (e) =>
        e.status === 'COMPLETED' &&
        e.completedAt &&
        new Date(e.completedAt).getMonth() === now.getMonth() &&
        new Date(e.completedAt).getFullYear() === now.getFullYear(),
    ).length;
    return { activeExits: activeExits.length, pendingIT, pendingFinance, completedThisMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exits]);

  const filtered = exits.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (deptFilter && e.employee.department?.name !== deptFilter) return false;
    if (search && !e.employee.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Exit &amp; Clearance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Run offboarding end to end — department sign-offs, knowledge handover, and final clearance.
          </p>
        </div>
        <button
          onClick={() => setShowInitiate(true)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + Initiate Exit
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Couldn't load exits data: {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Exits" value={kpis.activeExits} icon={ClockIcon} theme={TILE_THEMES[1]} />
        <KpiCard label="Pending IT Clearances" value={kpis.pendingIT} icon={LaptopIcon} theme={TILE_THEMES[4]} />
        <KpiCard label="Pending Financial Settlements" value={kpis.pendingFinance} icon={FileTextIcon} theme={TILE_THEMES[6]} />
        <KpiCard label="Completed Exits (This Month)" value={kpis.completedThisMonth} icon={CheckCircleIcon} theme={TILE_THEMES[3]} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-56"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500 text-sm">No exits match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Resignation Date</th>
                  <th className="pb-2 font-medium">Last Working Day</th>
                  <th className="pb-2 font-medium">KT Successor</th>
                  <th className="pb-2 font-medium">Clearance Progress</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((exit) => {
                  const assignedCount = exit.handovers.filter((h) => h.primarySuccessorId).length;
                  return (
                    <tr key={exit.id} className="hover:bg-slate-50">
                      <td className="py-2.5">
                        <div className="font-medium text-slate-700">{exit.employee.fullName}</div>
                        <div className="text-xs text-slate-400">{exit.employee.designation?.name || '—'}</div>
                      </td>
                      <td className="py-2.5 text-slate-500">{formatDate(exit.resignationDate)}</td>
                      <td className="py-2.5 text-slate-500">{formatDate(exit.lastWorkingDay)}</td>
                      <td className="py-2.5 text-slate-500">
                        {exit.handovers.length === 0 ? '—' : `${assignedCount}/${exit.handovers.length} assigned`}
                      </td>
                      <td className="py-2.5">
                        <ClearanceStepper exit={exit} />
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            exit.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {exit.status === 'COMPLETED' ? 'Cleared' : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setOpenExitId(exit.id)}
                          className="text-xs text-mitra-accentFrom hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInitiate && (
        <InitiateModal
          employees={employees}
          eligibleIds={eligibleIds}
          onClose={() => setShowInitiate(false)}
          onCreated={load}
        />
      )}

      {openExitId && (
        <ExitDrawer exitId={openExitId} employees={employees} onClose={() => setOpenExitId(null)} onChanged={load} />
      )}
    </div>
  );
}
