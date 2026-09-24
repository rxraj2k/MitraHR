import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  API_BASE,
  applyStaffingSandboxPlan,
  getStaffingSandboxBoard,
  getStaffingSandboxPlan,
  placeSandboxEmployee,
  resetStaffingSandbox,
} from '../../lib/api';
import { SandboxEmployeeCard, SandboxPlanChange, StaffingSandboxBoard } from '../../types';
import { RingAvatar } from '../../components/Avatar';
import { STATUS_ICON, STATUS_LABELS_SHORT, STATUS_THEME } from '../../lib/statusTheme';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';
import { SearchIcon, UserMinusIcon, UserPlusIcon, UsersIcon, XIcon } from '../../components/icons';

// A rough "what if" planning surface. It reads the real roster and real
// open projects, but every drag only moves a row in a separate sandbox
// table — it never creates a real project assignment or notifies anyone.
// Each card's status pill is the one exception: it's a read-only label of
// that person's REAL current utilization, shown for context only. Once a
// shuffle looks right, "Apply & Save Plan" below commits it for real —
// or you can always do it by hand on the Project detail page instead.

interface ColumnTheme {
  headerBg: string;
  headerShadow: string;
  body: string;
  border: string;
  dropzoneBorder: string;
  dropzoneText: string;
  dropGlow: string;
  chip: string;
  pill: string;
}

const COLUMN_THEMES: ColumnTheme[] = [
  {
    headerBg: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(79,70,229,0.55)]',
    body: 'bg-indigo-50/50',
    border: 'border-indigo-200',
    dropzoneBorder: 'border-indigo-300',
    dropzoneText: 'text-indigo-400',
    dropGlow: 'ring-4 ring-indigo-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-emerald-500 to-teal-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(5,150,105,0.55)]',
    body: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    dropzoneBorder: 'border-emerald-300',
    dropzoneText: 'text-emerald-500',
    dropGlow: 'ring-4 ring-emerald-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-amber-500 to-orange-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(217,119,6,0.55)]',
    body: 'bg-amber-50/50',
    border: 'border-amber-200',
    dropzoneBorder: 'border-amber-300',
    dropzoneText: 'text-amber-500',
    dropGlow: 'ring-4 ring-amber-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-sky-500 to-blue-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(2,132,199,0.55)]',
    body: 'bg-sky-50/50',
    border: 'border-sky-200',
    dropzoneBorder: 'border-sky-300',
    dropzoneText: 'text-sky-500',
    dropGlow: 'ring-4 ring-sky-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-fuchsia-500 to-pink-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(192,38,211,0.5)]',
    body: 'bg-fuchsia-50/50',
    border: 'border-fuchsia-200',
    dropzoneBorder: 'border-fuchsia-300',
    dropzoneText: 'text-fuchsia-500',
    dropGlow: 'ring-4 ring-fuchsia-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-rose-500 to-red-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(220,38,38,0.5)]',
    body: 'bg-rose-50/50',
    border: 'border-rose-200',
    dropzoneBorder: 'border-rose-300',
    dropzoneText: 'text-rose-500',
    dropGlow: 'ring-4 ring-rose-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
  {
    headerBg: 'bg-gradient-to-br from-teal-500 to-cyan-700',
    headerShadow: 'shadow-[0_10px_22px_-8px_rgba(13,148,136,0.5)]',
    body: 'bg-teal-50/50',
    border: 'border-teal-200',
    dropzoneBorder: 'border-teal-300',
    dropzoneText: 'text-teal-500',
    dropGlow: 'ring-4 ring-teal-300/60',
    chip: 'bg-white/20',
    pill: 'bg-white/25',
  },
];

const BENCH_THEME: ColumnTheme = {
  headerBg: 'bg-gradient-to-br from-slate-500 to-slate-700',
  headerShadow: 'shadow-[0_10px_22px_-8px_rgba(71,85,105,0.55)]',
  body: 'bg-slate-50/60',
  border: 'border-slate-200',
  dropzoneBorder: 'border-slate-300',
  dropzoneText: 'text-slate-400',
  dropGlow: 'ring-4 ring-slate-300/60',
  chip: 'bg-white/20',
  pill: 'bg-white/25',
};

const SKILL_PILL_STYLES = [
  'bg-indigo-50 text-indigo-600',
  'bg-sky-50 text-sky-600',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-rose-50 text-rose-600',
];

function matchesQuery(card: SandboxEmployeeCard, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (card.fullName.toLowerCase().includes(q)) return true;
  if ((card.designationName || '').toLowerCase().includes(q)) return true;
  return card.skills.some((s) => s.toLowerCase().includes(q));
}

function EmployeeCard({
  card,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  card: SandboxEmployeeCard;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const StatusIcon = STATUS_ICON[card.realStatus];
  const isDragging = draggingId === card.id;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl border border-slate-100 px-3 py-2.5 cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
        isDragging
          ? 'opacity-50 scale-[0.97] -translate-y-1 rotate-2 shadow-xl ring-2 ring-white'
          : 'shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-4px_rgba(15,23,42,0.18)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {card.photoUrl ? (
          <img src={`${API_BASE}${card.photoUrl}`} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
        ) : (
          <RingAvatar name={card.fullName} ring={STATUS_THEME[card.realStatus].ring} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-700 truncate">{card.fullName}</p>
          <p className="text-xs text-slate-400 truncate">{card.designationName || '—'}</p>
        </div>
      </div>

      {card.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.skills.slice(0, 3).map((skill, i) => (
            <span
              key={skill}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SKILL_PILL_STYLES[i % SKILL_PILL_STYLES.length]}`}
            >
              {skill}
            </span>
          ))}
          {card.skills.length > 3 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              +{card.skills.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_THEME[card.realStatus].badge}`}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          {STATUS_LABELS_SHORT[card.realStatus]} · {card.realAllocationPercent}%
        </span>
      </div>
    </div>
  );
}

function Dropzone({ theme, label }: { theme: ColumnTheme; label: string }) {
  return (
    <div className={`border-2 border-dashed ${theme.dropzoneBorder} rounded-xl py-8 text-center`}>
      <p className={`text-xs font-medium ${theme.dropzoneText}`}>{label}</p>
    </div>
  );
}

function PlanModal({
  changes,
  applying,
  error,
  onCancel,
  onConfirm,
}: {
  changes: SandboxPlanChange[];
  applying: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Apply Sandbox Plan</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-2">
          <p className="text-sm text-slate-500 mb-3">
            This will make the following changes to real project rosters — each move sets 100% allocation and ends
            whatever real assignment it replaces. Everyone involved will be notified, same as adding or ending an
            assignment by hand.
          </p>
          {changes.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
                c.type === 'ASSIGN' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {c.type === 'ASSIGN' ? (
                <UserPlusIcon className="w-4 h-4 flex-shrink-0" />
              ) : (
                <UserMinusIcon className="w-4 h-4 flex-shrink-0" />
              )}
              <span>
                {c.type === 'ASSIGN' ? (
                  <>
                    Assign <span className="font-semibold">{c.employeeName}</span> to{' '}
                    <span className="font-semibold">{c.projectName}</span> at 100% allocation
                  </>
                ) : (
                  <>
                    End <span className="font-semibold">{c.employeeName}</span>'s assignment on{' '}
                    <span className="font-semibold">{c.projectName}</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        {error && <p className="px-5 text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={applying}
            className="rounded-lg border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${PRIMARY_BUTTON_3D}`}
          >
            {applying ? 'Applying...' : `Confirm & Apply (${changes.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffingSandbox() {
  const { token } = useAuth();
  const [board, setBoard] = useState<StaffingSandboxBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState('');
  const [planChanges, setPlanChanges] = useState<SandboxPlanChange[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [applying, setApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const draggingRef = useRef(false);

  function load() {
    if (!token || draggingRef.current) return;
    getStaffingSandboxBoard(token)
      .then(setBoard)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  function findCurrentColumn(employeeId: string): { key: string; card: SandboxEmployeeCard } | null {
    if (!board) return null;
    for (const key of Object.keys(board.columns)) {
      const card = board.columns[key].find((c) => c.id === employeeId);
      if (card) return { key, card };
    }
    return null;
  }

  async function handleDrop(targetKey: string) {
    setDragOverKey(null);
    const employeeId = draggingId;
    draggingRef.current = false;
    setDraggingId(null);
    if (!employeeId || !board || !token) return;

    const found = findCurrentColumn(employeeId);
    if (!found || found.key === targetKey) return;

    // Optimistic move so the drop feels instant; reload on failure.
    const nextColumns = { ...board.columns };
    nextColumns[found.key] = nextColumns[found.key].filter((c) => c.id !== employeeId);
    nextColumns[targetKey] = [...nextColumns[targetKey], found.card];
    setBoard({ ...board, columns: nextColumns });

    try {
      await placeSandboxEmployee(token, employeeId, targetKey === 'bench' ? null : targetKey);
    } catch (e: any) {
      setError(e.message);
      load();
    }
  }

  async function handleReset() {
    if (!token) return;
    setResetting(true);
    setError('');
    try {
      await resetStaffingSandbox(token);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleOpenPlan() {
    if (!token) return;
    setPlanLoading(true);
    setError('');
    try {
      const changes = await getStaffingSandboxPlan(token);
      if (changes.length === 0) {
        setSuccessMessage('The sandbox already matches reality — nothing to apply.');
      } else {
        setPlanChanges(changes);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleConfirmApply() {
    if (!token) return;
    setApplying(true);
    setPlanError('');
    try {
      const result = await applyStaffingSandboxPlan(token);
      setPlanChanges(null);
      setSuccessMessage(`Applied ${result.changesApplied} change${result.changesApplied === 1 ? '' : 's'} to real project rosters.`);
      load();
    } catch (e: any) {
      setPlanError(e.message);
    } finally {
      setApplying(false);
    }
  }

  const projects = board?.projects || [];
  const benchCards = useMemo(
    () => (board?.columns.bench || []).filter((c) => matchesQuery(c, search)),
    [board, search],
  );

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Staffing Sandbox</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-snug">
            Drag anyone between columns to try out a shuffle. This is a rough planning space only — it never creates
            a real project assignment or notifies anyone until you apply the plan below.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleOpenPlan}
            disabled={planLoading || loading || resetting}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${PRIMARY_BUTTON_3D}`}
          >
            {planLoading ? 'Checking...' : 'Apply & Save Plan'}
          </button>
          <button
            onClick={handleReset}
            disabled={resetting || loading}
            className="rounded-lg border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2 bg-white shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Board'}
          </button>
        </div>
      </div>

      <div className="relative mt-4 max-w-sm">
        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by name or skill..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white shadow-inner shadow-slate-100 focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom/40 focus:border-mitra-accentFrom"
        />
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {successMessage && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mt-3 inline-block">
          {successMessage}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm mt-6">Loading...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 mt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverKey('bench');
            }}
            onDragLeave={() => setDragOverKey((k) => (k === 'bench' ? null : k))}
            onDrop={() => handleDrop('bench')}
            className={`flex-shrink-0 w-72 rounded-2xl border ${BENCH_THEME.border} ${BENCH_THEME.body} transition-shadow duration-150 ${
              dragOverKey === 'bench' ? BENCH_THEME.dropGlow : ''
            }`}
          >
            <div className={`px-4 py-3 rounded-t-2xl text-white ${BENCH_THEME.headerBg} ${BENCH_THEME.headerShadow}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <UsersIcon className="w-4 h-4" /> Bench / Unassigned
                </p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${BENCH_THEME.pill}`}>
                  {board?.columns.bench.length ?? 0} people
                </span>
              </div>
            </div>
            <div className="p-3 space-y-2 min-h-[140px]">
              {benchCards.length === 0 ? (
                <Dropzone
                  theme={BENCH_THEME}
                  label={search ? 'No matches on the bench' : '+ Drop staff here to send them to the bench'}
                />
              ) : (
                benchCards.map((card) => (
                  <EmployeeCard
                    key={card.id}
                    card={card}
                    draggingId={draggingId}
                    onDragStart={(id) => {
                      draggingRef.current = true;
                      setDraggingId(id);
                    }}
                    onDragEnd={() => {
                      draggingRef.current = false;
                      setDraggingId(null);
                      setDragOverKey(null);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {projects.map((project, i) => {
            const theme = COLUMN_THEMES[i % COLUMN_THEMES.length];
            const allCards = board?.columns[project.id] || [];
            const cards = allCards.filter((c) => matchesQuery(c, search));
            return (
              <div
                key={project.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverKey(project.id);
                }}
                onDragLeave={() => setDragOverKey((k) => (k === project.id ? null : k))}
                onDrop={() => handleDrop(project.id)}
                className={`flex-shrink-0 w-72 rounded-2xl border ${theme.border} ${theme.body} transition-shadow duration-150 ${
                  dragOverKey === project.id ? theme.dropGlow : ''
                }`}
              >
                <div className={`px-4 py-3 rounded-t-2xl text-white ${theme.headerBg} ${theme.headerShadow}`}>
                  <p className="text-sm font-semibold truncate">{project.name}</p>
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${theme.chip}`}>{project.clientName}</span>
                    {project.category && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${theme.chip}`}>
                        {project.category.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${theme.pill}`}>
                      👥 {allCards.length} Allocated
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[140px]">
                  {cards.length === 0 ? (
                    <Dropzone theme={theme} label={search ? 'No matches here' : '+ Drop staff here to allocate'} />
                  ) : (
                    cards.map((card) => (
                      <EmployeeCard
                        key={card.id}
                        card={card}
                        draggingId={draggingId}
                        onDragStart={(id) => {
                          draggingRef.current = true;
                          setDraggingId(id);
                        }}
                        onDragEnd={() => {
                          draggingRef.current = false;
                          setDraggingId(null);
                          setDragOverKey(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <p className="text-slate-500 text-sm">No active or on-hold projects to shuffle people onto right now.</p>
          )}
        </div>
      )}

      {planChanges && (
        <PlanModal
          changes={planChanges}
          applying={applying}
          error={planError}
          onCancel={() => {
            setPlanChanges(null);
            setPlanError('');
          }}
          onConfirm={handleConfirmApply}
        />
      )}
    </div>
  );
}
