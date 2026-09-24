import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { addProjectAssignment, getProjects, getUtilization, updateProjectAssignment } from '../../lib/api';
import { Project, UtilizationAssignment, UtilizationEntry, UtilizationResponse, UtilizationStatus, UtilizationSummary } from '../../types';
import { RingAvatar } from '../../components/Avatar';
import SearchableSelect from '../../components/SearchableSelect';
import { STATUS_LABELS, STATUS_ICON, STATUS_THEME } from '../../lib/statusTheme';
import { GaugeIcon, UserPlusIcon, XIcon } from '../../components/icons';

const SUMMARY_FIELD: Record<UtilizationStatus, keyof UtilizationSummary> = {
  BENCH: 'bench',
  IN_TRAINING: 'inTraining',
  PARTIAL: 'partial',
  FULL: 'full',
  OVER: 'over',
};

const FILTERS: { key: UtilizationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'BENCH', label: 'On Bench' },
  { key: 'IN_TRAINING', label: 'In Training' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'FULL', label: 'Full' },
  { key: 'OVER', label: 'Over-Allocated' },
];

// A rotating categorical palette for the per-project segments of the
// allocation bar and the drawer's project cards — independent of status
// color, since each segment/card here identifies a different PROJECT, not
// the employee's overall bench/training/allocation state.
const SEGMENT_BAR_COLORS = ['bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-cyan-500'];
const SEGMENT_CARD_COLORS = [
  'border-sky-200 bg-sky-50/60',
  'border-violet-200 bg-violet-50/60',
  'border-amber-200 bg-amber-50/60',
  'border-emerald-200 bg-emerald-50/60',
  'border-rose-200 bg-rose-50/60',
  'border-cyan-200 bg-cyan-50/60',
];

function AllocationBar({ entry }: { entry: UtilizationEntry }) {
  if (entry.assignments.length <= 1) {
    const width = Math.min(entry.totalAllocation, 100);
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
          <div className={`h-full rounded-full ${STATUS_THEME[entry.status].barSolid}`} style={{ width: `${width}%` }} />
        </div>
        <span className="text-slate-600 text-xs w-10">{entry.totalAllocation}%</span>
      </div>
    );
  }
  // Multiple concurrent projects — segment the bar so each project's slice
  // is visible at a glance. Widths are proportional to each project's
  // allocation and compressed to fit the 100%-wide track when the total
  // goes over 100 (over-allocated), with a red ring calling that out.
  const total = entry.assignments.reduce((s, a) => s + a.allocationPercent, 0) || 1;
  const scale = total > 100 ? 100 / total : 1;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 flex ${
          entry.status === 'OVER' ? 'ring-2 ring-red-400' : ''
        }`}
      >
        {entry.assignments.map((a, i) => (
          <div
            key={a.assignmentId}
            title={`${a.projectName}: ${a.allocationPercent}%`}
            className={`h-full ${SEGMENT_BAR_COLORS[i % SEGMENT_BAR_COLORS.length]} ${i > 0 ? 'border-l border-white/50' : ''}`}
            style={{ width: `${a.allocationPercent * scale}%` }}
          />
        ))}
      </div>
      <span className={`text-xs w-10 ${entry.status === 'OVER' ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
        {entry.totalAllocation}%
      </span>
    </div>
  );
}

// Quick Allocation drawer — lets a manager adjust or end an employee's
// existing project assignments, or put them straight onto a new project
// (e.g. take someone from 0% Bench to 100% Allocated), without leaving
// this screen. Keeps its own local copy of the assignment list so edits
// reflect immediately; `onChanged` tells the page underneath to refresh
// the summary counts and table once the drawer's done something.
function AllocationDrawer({
  entry,
  token,
  onClose,
  onChanged,
}: {
  entry: UtilizationEntry;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [assignments, setAssignments] = useState<UtilizationAssignment[]>(entry.assignments);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newProjectId, setNewProjectId] = useState('');
  const [newAllocation, setNewAllocation] = useState('100');
  const [newRole, setNewRole] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getProjects(token)
      .then((all) => setProjects(all.filter((p) => p.status === 'ACTIVE' || p.status === 'ON_HOLD')))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const assignedProjectIds = new Set(assignments.map((a) => a.projectId));
  const projectOptions = projects
    .filter((p) => !assignedProjectIds.has(p.id))
    .map((p) => ({ id: p.id, name: `${p.name} (${p.client.name})` }));

  async function saveAllocation(a: UtilizationAssignment) {
    const draft = drafts[a.assignmentId];
    const pct = Number(draft);
    if (!draft || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError('Allocation must be a number between 1 and 100.');
      return;
    }
    setError('');
    setSavingId(a.assignmentId);
    try {
      await updateProjectAssignment(token, a.projectId, a.assignmentId, { allocationPercent: pct });
      setAssignments((prev) => prev.map((x) => (x.assignmentId === a.assignmentId ? { ...x, allocationPercent: pct } : x)));
      setDrafts((d) => {
        const next = { ...d };
        delete next[a.assignmentId];
        return next;
      });
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function endAssignment(a: UtilizationAssignment) {
    if (!confirm(`End ${entry.fullName}'s assignment on ${a.projectName} as of today?`)) return;
    setError('');
    try {
      await updateProjectAssignment(token, a.projectId, a.assignmentId, { endDate: new Date().toISOString().slice(0, 10) });
      setAssignments((prev) => prev.filter((x) => x.assignmentId !== a.assignmentId));
      onChanged();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addAssignment(e: FormEvent) {
    e.preventDefault();
    if (!newProjectId) return;
    setError('');
    setAdding(true);
    try {
      const created = await addProjectAssignment(token, newProjectId, {
        employeeId: entry.id,
        allocationPercent: Number(newAllocation) || 100,
        roleOnProject: newRole || undefined,
      });
      const project = projects.find((p) => p.id === newProjectId);
      setAssignments((prev) => [
        ...prev,
        {
          assignmentId: created.id,
          projectId: newProjectId,
          projectName: project?.name || 'Project',
          projectStatus: project?.status || 'ACTIVE',
          clientName: project?.client.name || '',
          allocationPercent: created.allocationPercent,
          roleOnProject: created.roleOnProject,
        },
      ]);
      setNewProjectId('');
      setNewAllocation('100');
      setNewRole('');
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const total = assignments.reduce((s, a) => s + a.allocationPercent, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RingAvatar name={entry.fullName} photoUrl={entry.photoUrl} ring={STATUS_THEME[entry.status].ring} size="md" />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{entry.fullName}</h2>
              <p className="text-xs text-slate-400">
                {[entry.designationName, entry.departmentName].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs font-semibold mt-3 ${total > 100 ? 'text-red-600' : 'text-slate-500'}`}>
          Total allocation: {total}%{total > 100 ? ' — over-allocated' : ''}
        </p>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Projects</h3>
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-400">Not on any project right now — on the bench.</p>
          ) : (
            assignments.map((a, i) => (
              <div key={a.assignmentId} className={`rounded-xl border p-3 ${SEGMENT_CARD_COLORS[i % SEGMENT_CARD_COLORS.length]}`}>
                <Link to={`/projects/${a.projectId}`} className="text-sm font-medium text-slate-700 hover:underline">
                  {a.projectName}
                </Link>
                <p className="text-xs text-slate-400">
                  {a.clientName}
                  {a.roleOnProject ? ` · ${a.roleOnProject}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={a.allocationPercent}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.assignmentId]: e.target.value }))}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm bg-white"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <button
                    type="button"
                    onClick={() => saveAllocation(a)}
                    disabled={savingId === a.assignmentId || drafts[a.assignmentId] === undefined}
                    className="ml-auto text-xs font-medium px-2.5 py-1 rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white disabled:opacity-40 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
                  >
                    {savingId === a.assignmentId ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => endAssignment(a)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  >
                    End
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">+ Assign to a Project</h3>
          <form onSubmit={addAssignment} className="space-y-3">
            <SearchableSelect
              options={projectOptions}
              value={newProjectId}
              onChange={setNewProjectId}
              placeholder="Search project..."
            />
            <div className="flex gap-3">
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role on project (optional)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={newAllocation}
                onChange={(e) => setNewAllocation(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !newProjectId}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <UserPlusIcon className="w-4 h-4" />
              {adding ? 'Assigning...' : 'Assign to Project'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function UtilizationPage() {
  const { token } = useAuth();
  const [data, setData] = useState<UtilizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<UtilizationStatus | 'ALL'>('ALL');
  const [allocDrawer, setAllocDrawer] = useState<UtilizationEntry | null>(null);

  function load() {
    if (!token) return;
    getUtilization(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);
  useAutoRefresh(load);

  const employees = data?.employees || [];
  const shown = filter === 'ALL' ? employees : employees.filter((e) => e.status === filter);
  // Keep the drawer's employee in sync once a refresh comes back (e.g. its
  // status/summary tile now moving it to a different bucket).
  const allocDrawerEntry = allocDrawer ? employees.find((e) => e.id === allocDrawer.id) || allocDrawer : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Bench & Utilization</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(Object.keys(STATUS_THEME) as UtilizationStatus[]).map((key) => {
              const theme = STATUS_THEME[key];
              const Icon = STATUS_ICON[key];
              const value = data?.summary[SUMMARY_FIELD[key]] ?? 0;
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(isActive ? 'ALL' : key)}
                  title="Click to filter the table below"
                  className={`text-left rounded-2xl p-5 border border-white/10 ${theme.tileBg} ${theme.tileShadow}
                    transition-all duration-150 ease-out hover:-translate-y-1 active:translate-y-0
                    ${isActive ? 'ring-4 ring-white/70 scale-[1.02]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/25 text-white flex-shrink-0 shadow-inner">
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="text-xs font-semibold text-white/90">{STATUS_LABELS[key]}</p>
                  </div>
                  <p className="text-3xl font-bold text-white mt-3 drop-shadow-sm">{value}</p>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 text-sm flex-wrap">
            {FILTERS.map((f) => {
              const theme = f.key === 'ALL' ? null : STATUS_THEME[f.key];
              const active = filter === f.key;
              const activeClass =
                f.key === 'ALL'
                  ? 'bg-gradient-to-br from-mitra-navy to-slate-800 text-white shadow-lg shadow-slate-800/40 ring-2 ring-slate-400'
                  : theme!.filterActive;
              const inactiveClass =
                f.key === 'ALL'
                  ? 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                  : theme!.filterInactive;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded-xl font-medium transition-all duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0.5 ${
                    active ? activeClass : inactiveClass
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {shown.length === 0 ? (
              <p className="text-slate-500 text-sm">No one matches this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Employee</th>
                      <th className="pb-2 font-medium">Department / Designation</th>
                      <th className="pb-2 font-medium">Allocation</th>
                      <th className="pb-2 font-medium">Projects</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <RingAvatar name={e.fullName} photoUrl={e.photoUrl} ring={STATUS_THEME[e.status].ring} />
                            <Link to={`/employees/${e.id}`} className="font-medium text-mitra-accentFrom hover:underline">
                              {e.fullName}
                            </Link>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {[e.designationName, e.departmentName].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-2.5">
                          <AllocationBar entry={e} />
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {e.assignments.length === 0 ? (
                            '—'
                          ) : (
                            <ul className="space-y-0.5">
                              {e.assignments.map((a) => (
                                <li key={a.assignmentId}>
                                  <Link to={`/projects/${a.projectId}`} className="hover:underline">
                                    {a.projectName}
                                  </Link>{' '}
                                  <span className="text-slate-400">
                                    ({a.clientName} · {a.allocationPercent}%)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_THEME[e.status].badge}`}
                          >
                            {STATUS_LABELS[e.status]}
                          </span>
                          {e.trainingTotal > 0 && (
                            <div className="mt-1">
                              <Link to="/training" className="text-xs text-slate-400 hover:text-mitra-accentFrom hover:underline">
                                Training: {e.trainingCompleted}/{e.trainingTotal}
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5">
                          <button
                            type="button"
                            onClick={() => setAllocDrawer(e)}
                            title="Edit Allocation"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium shadow hover:-translate-y-0.5 active:translate-y-0 transition-transform"
                          >
                            <GaugeIcon className="w-3.5 h-3.5" />
                            Edit Allocation
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {allocDrawerEntry && (
        <AllocationDrawer
          entry={allocDrawerEntry}
          token={token!}
          onClose={() => setAllocDrawer(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
