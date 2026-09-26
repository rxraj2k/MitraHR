import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getReviewCycles,
  createReviewCycle,
  updateReviewCycle,
  deleteReviewCycle,
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  getEmployees,
  getProjects,
  getPerformanceReviews,
  createPerformanceReview,
  getPerformanceReview,
  submitReviewFeedback,
  finalizePerformanceReview,
  deletePerformanceReview,
  getPerformanceReviewProjectContext,
  getCheckIns,
} from '../../lib/api';
import {
  ReviewCycle,
  ReviewCycleStatus,
  Goal,
  GoalStatus,
  GoalCategory,
  KeyResult,
  REVIEW_CYCLE_STATUSES,
  GOAL_STATUSES,
  GOAL_CATEGORIES,
  PerformanceReview,
  ReviewRaterType,
  REVIEW_RATER_TYPES,
  Employee,
  Project,
  CheckIn,
  ProjectContextAssignment,
} from '../../types';
import { TargetIcon, ChartBarIcon, ClockIcon, TrophyIcon, StarIcon, GridIcon } from '../../components/icons';
import MetricTile from '../../components/MetricTile';
import Progress3DBar from '../../components/Progress3DBar';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';
import TabBar, { TabBarItem } from '../../components/TabBar';
import AdminAppraisalDashboard from '../../components/AdminAppraisalDashboard';

// --- Labels & badge lookups ------------------------------------------------

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  AT_RISK: 'At Risk',
  COMPLETED: 'Completed',
};
const GOAL_STATUS_BADGE: Record<GoalStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  AT_RISK: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};
// TEAM is displayed as "Department" in the UI — same precedent as
// Recruitment's FINAL_ROUND -> "Client Round" relabeling. The DB value
// stays TEAM; only the label changes.
const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  INDIVIDUAL: 'Individual',
  TEAM: 'Department',
  COMPANY: 'Company',
};
const GOAL_LEVEL_BADGE: Record<GoalCategory, string> = {
  COMPANY: 'bg-fuchsia-100 text-fuchsia-700',
  TEAM: 'bg-sky-100 text-sky-700',
  INDIVIDUAL: 'bg-slate-100 text-slate-600',
};
const CYCLE_STATUS_BADGE: Record<ReviewCycleStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-500',
};
const REVIEW_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};
const REVIEW_STATUS_BADGE: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};
const RATER_TYPE_LABELS: Record<ReviewRaterType, string> = {
  SELF: 'Self',
  MANAGER: 'Manager',
  PEER: 'Peer',
  CLIENT: 'Client',
};
const RATER_TYPE_BADGE: Record<ReviewRaterType, string> = {
  SELF: 'bg-slate-100 text-slate-600',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  PEER: 'bg-fuchsia-100 text-fuchsia-700',
  CLIENT: 'bg-amber-100 text-amber-700',
};

// The 4 raw ReviewFeedback rating fields, relabeled for the scorecard so
// they read like real competencies rather than generic form fields — same
// display-only relabeling precedent as GOAL_CATEGORY_LABELS above.
const COMPETENCY_FIELDS: {
  key: 'technicalRating' | 'communicationRating' | 'teamworkRating' | 'goalAchievementRating';
  label: string;
}[] = [
  { key: 'technicalRating', label: 'Technical Execution' },
  { key: 'communicationRating', label: 'Client Communication' },
  { key: 'teamworkRating', label: 'Leadership & Teamwork' },
  { key: 'goalAchievementRating', label: 'Goal Achievement' },
];

const KPI_CARD_THEME: Record<'indigo' | 'sky' | 'fuchsia' | 'emerald', (typeof TILE_THEMES)[number]> = {
  indigo: TILE_THEMES[0],
  sky: TILE_THEMES[2],
  fuchsia: TILE_THEMES[5],
  emerald: TILE_THEMES[3],
};

// 9-box performance-vs-potential grid — rows are potential tiers (top =
// high), columns are performance tiers (left = low), the standard layout
// HR leaders expect from a talent review.
const NINE_BOX_GRID: Record<number, Record<number, { label: string; tone: string }>> = {
  2: {
    0: { label: 'Rough Diamond', tone: 'bg-amber-50 border-amber-200' },
    1: { label: 'Future Star', tone: 'bg-sky-50 border-sky-200' },
    2: { label: 'High Performer', tone: 'bg-emerald-50 border-emerald-200' },
  },
  1: {
    0: { label: 'Inconsistent Player', tone: 'bg-rose-50 border-rose-200' },
    1: { label: 'Core Player', tone: 'bg-slate-50 border-slate-200' },
    2: { label: 'Key Player', tone: 'bg-sky-50 border-sky-200' },
  },
  0: {
    0: { label: 'Needs Coaching', tone: 'bg-rose-50 border-rose-200' },
    1: { label: 'Solid Professional', tone: 'bg-slate-50 border-slate-200' },
    2: { label: 'Trusted Expert', tone: 'bg-emerald-50 border-emerald-200' },
  },
};

// Maps a 1-5 rating to a 0/1/2 (Low/Medium/High) tier for the 9-box grid.
function tierIndex(rating: number): 0 | 1 | 2 {
  if (rating >= 4) return 2;
  if (rating === 3) return 1;
  return 0;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// Red <40%, Yellow 40-70%, Green >70% — the explicit color coding the
// redesign asked for on every goal progress bar.
function progressBarColor(pct: number) {
  if (pct > 70) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
  if (pct >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-600';
  return 'bg-gradient-to-r from-rose-400 to-rose-600';
}

function pillTone(kind: 'done' | 'partial' | 'pending') {
  if (kind === 'done') return 'bg-emerald-100 text-emerald-700';
  if (kind === 'partial') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

// --- Small shared pieces ----------------------------------------------------

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: keyof typeof KPI_CARD_THEME;
  icon: (props: { className?: string }) => JSX.Element;
}) {
  return (
    <div className={tileWrapperClass(KPI_CARD_THEME[color])}>
      <MetricTile icon={icon} label={label} value={value} />
    </div>
  );
}

function GoalProgressBar({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1">
        <Progress3DBar percent={progress} fillClassName={progressBarColor(progress)} height="h-1.5" />
      </div>
      <span className="text-xs font-medium text-slate-500 w-8 text-right">{progress}%</span>
    </div>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="text-amber-400 hover:scale-110 transition-transform"
        >
          <StarIcon filled={n <= value} className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

function ActiveCycleBanner({
  cycle,
  onLaunchNew,
}: {
  cycle: ReviewCycle | undefined;
  onLaunchNew: () => void;
}) {
  if (!cycle) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">No active review cycle</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Launch a cycle to start tracking OKRs and reviews for this period.
          </p>
        </div>
        <button
          onClick={onLaunchNew}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + Launch New Cycle
        </button>
      </div>
    );
  }

  const totalDays = Math.max(1, daysBetween(cycle.startDate, cycle.endDate));
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(cycle.startDate, new Date().toISOString())));
  const pct = Math.round((elapsed / totalDays) * 100);
  const remaining = daysUntil(cycle.endDate);

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wide">
            <TargetIcon className="w-3.5 h-3.5" /> Active Review Cycle
          </span>
          <h2 className="text-lg font-semibold text-slate-800 mt-1">{cycle.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)} · {cycle._count?.goals || 0} goals ·{' '}
            {cycle._count?.reviews || 0} reviews
          </p>
        </div>
        <button
          onClick={onLaunchNew}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 flex-shrink-0 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + Launch New Cycle
        </button>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Cycle Progress</span>
          <span className={remaining <= 7 && remaining >= 0 ? 'text-rose-600 font-medium' : ''}>
            {remaining >= 0 ? `${remaining} day${remaining === 1 ? '' : 's'} remaining` : 'Cycle ended'}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/70 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onOpen,
  onDelete,
}: {
  goal: Goal;
  onOpen: (id: string) => void;
  onDelete: (goal: Goal) => void;
}) {
  const doneCount = goal.keyResults.filter((k) => k.completed).length;
  const totalCount = goal.keyResults.length;
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 hover:shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={() => onOpen(goal.id)} className="flex items-center gap-2 flex-wrap text-left">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${GOAL_LEVEL_BADGE[goal.category]}`}>
            {GOAL_CATEGORY_LABELS[goal.category]}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${GOAL_STATUS_BADGE[goal.status]}`}>
            {GOAL_STATUS_LABELS[goal.status]}
          </span>
        </button>
        <button onClick={() => onDelete(goal)} className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0">
          ✕
        </button>
      </div>
      <button onClick={() => onOpen(goal.id)} className="block w-full text-left">
        <div className="font-medium text-slate-800 text-sm">{goal.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {goal.employee?.fullName}
          {goal.project ? ` · ${goal.project.name} (${goal.project.client.name})` : ''}
        </div>
        {totalCount > 0 && (
          <div className="mt-2.5 space-y-1">
            {goal.keyResults.slice(0, 3).map((kr) => (
              <div key={kr.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${
                    kr.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                  }`}
                >
                  {kr.completed ? '✓' : ''}
                </span>
                <span className={kr.completed ? 'line-through text-slate-400' : ''}>
                  {kr.title}
                  {kr.targetValue ? ` (${kr.targetValue})` : ''}
                </span>
              </div>
            ))}
            <div className="text-[11px] text-slate-400 font-medium pt-0.5">
              {doneCount}/{totalCount} Key Results Done
            </div>
          </div>
        )}
        <div className="mt-3">
          <GoalProgressBar progress={goal.progress} />
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5">
          {goal.dueDate ? `Target: ${formatDate(goal.dueDate)}` : 'No target date'}
          {goal.reviewCycle ? ` · ${goal.reviewCycle.name}` : ''}
        </div>
      </button>
    </div>
  );
}

function GoalAlignmentTree({
  goals,
  onOpen,
  onDelete,
}: {
  goals: Goal[];
  onOpen: (id: string) => void;
  onDelete: (goal: Goal) => void;
}) {
  const byParent = useMemo(() => {
    const map = new Map<string, Goal[]>();
    goals.forEach((g) => {
      const key = g.parentGoalId || '__root__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return map;
  }, [goals]);

  function renderNode(goal: Goal, depth: number): JSX.Element {
    const children = byParent.get(goal.id) || [];
    return (
      <div key={goal.id} className={depth > 0 ? 'pl-6 border-l-2 border-dashed border-slate-200 ml-3 mt-3' : 'mt-3'}>
        <GoalCard goal={goal} onOpen={onOpen} onDelete={onDelete} />
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  const roots = byParent.get('__root__') || [];
  if (roots.length === 0) return <p className="text-slate-500 text-sm">No goals match.</p>;
  return <div className="-mt-3">{roots.map((r) => renderNode(r, 0))}</div>;
}

function NineBoxGrid({ reviews }: { reviews: PerformanceReview[] }) {
  const scored = reviews.filter(
    (r) => typeof r.overallRating === 'number' && typeof r.potentialRating === 'number',
  );
  const buckets = useMemo(() => {
    const map = new Map<string, PerformanceReview[]>();
    scored.forEach((r) => {
      const key = `${tierIndex(r.potentialRating as number)}-${tierIndex(r.overallRating as number)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [scored]);

  if (scored.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No finalized reviews with both a performance and potential rating yet — the grid populates once managers
        finalize reviews with a potential rating.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
        <span className="font-medium text-slate-500">↑ Potential</span>
        <span>·</span>
        <span className="font-medium text-slate-500">Performance →</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[2, 1, 0].map((potential) =>
          [0, 1, 2].map((performance) => {
            const cell = NINE_BOX_GRID[potential][performance];
            const items = buckets.get(`${potential}-${performance}`) || [];
            return (
              <div key={`${potential}-${performance}`} className={`border rounded-lg p-3 min-h-[110px] ${cell.tone}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{cell.label}</span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {items.slice(0, 4).map((r) => (
                    <div key={r.id} className="text-[11px] text-slate-600 truncate">
                      {r.employee?.fullName}
                    </div>
                  ))}
                  {items.length > 4 && <div className="text-[11px] text-slate-400">+{items.length - 4} more</div>}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

// --- Modals ------------------------------------------------------------------

function NewCycleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await createReviewCycle(token, { name, startDate, endDate });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Review Cycle</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="e.g. Q3 2026 Engineering & Ops Review"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-1.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Creating...' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewGoalModal({
  employees,
  cycles,
  goals,
  projects,
  onClose,
  onCreated,
}: {
  employees: Employee[];
  cycles: ReviewCycle[];
  goals: Goal[];
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('INDIVIDUAL');
  const [reviewCycleId, setReviewCycleId] = useState('');
  const [parentGoalId, setParentGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !employeeId) return;
    setSaving(true);
    setError('');
    try {
      await createGoal(token, {
        employeeId,
        title,
        description: description || undefined,
        category,
        reviewCycleId: reviewCycleId || undefined,
        parentGoalId: parentGoalId || undefined,
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="e.g. Increase US Client Retention"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Level</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {GOAL_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Target End-Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Aligns To (Parent Goal)</label>
            <select
              value={parentGoalId}
              onChange={(e) => setParentGoalId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">None — top-level goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  [{GOAL_CATEGORY_LABELS[g.category]}] {g.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Aligned US Client / Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.client.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Review Cycle</label>
            <select
              value={reviewCycleId}
              onChange={(e) => setReviewCycleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Ongoing (not tied to a cycle)</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-1.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InitiateReviewModal({
  employees,
  cycles,
  defaultCycleId,
  onClose,
  onCreated,
}: {
  employees: Employee[];
  cycles: ReviewCycle[];
  defaultCycleId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [reviewCycleId, setReviewCycleId] = useState(defaultCycleId || cycles[0]?.id || '');
  const [expectedPeerReviewers, setExpectedPeerReviewers] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !employeeId || !reviewCycleId) return;
    setSaving(true);
    setError('');
    try {
      await createPerformanceReview(token, { employeeId, reviewCycleId, expectedPeerReviewers });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Initiate 360° Performance Review</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Review Cycle</label>
            <select
              required
              value={reviewCycleId}
              onChange={(e) => setReviewCycleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Select cycle</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Expected Peer Reviewers</label>
            <input
              type="number"
              min={0}
              max={10}
              value={expectedPeerReviewers}
              onChange={(e) => setExpectedPeerReviewers(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Drives the "X/Y Received" badge on the 360° matrix — not enforced, just a target.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-1.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Initiating...' : 'Initiate Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Goal Detail Drawer -------------------------------------------------------

function GoalDetailDrawer({
  goalId,
  onClose,
  onChanged,
}: {
  goalId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GoalStatus>('NOT_STARTED');
  const [saving, setSaving] = useState(false);
  const [newKrTitle, setNewKrTitle] = useState('');
  const [newKrTarget, setNewKrTarget] = useState('');
  const [addingKr, setAddingKr] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!token) return;
    const data = await getGoal(token, goalId);
    setGoal(data);
    setProgress(data.progress);
    setStatus(data.status);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, token]);

  async function refresh() {
    await load();
    onChanged();
  }

  async function saveProgress() {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await updateGoal(token, goalId, { progress, status });
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addKeyResult(e: FormEvent) {
    e.preventDefault();
    if (!token || !newKrTitle.trim()) return;
    setAddingKr(true);
    setError('');
    try {
      await createKeyResult(token, goalId, { title: newKrTitle, targetValue: newKrTarget || undefined });
      setNewKrTitle('');
      setNewKrTarget('');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingKr(false);
    }
  }

  async function toggleKeyResult(kr: KeyResult) {
    if (!token) return;
    await updateKeyResult(token, kr.id, { completed: !kr.completed });
    await refresh();
  }

  async function removeKeyResult(kr: KeyResult) {
    if (!token) return;
    await deleteKeyResult(token, kr.id);
    await refresh();
  }

  async function handleDelete() {
    if (!token || !goal) return;
    if (!confirm(`Delete goal "${goal.title}"? This also deletes its key results and check-ins.`)) return;
    await deleteGoal(token, goalId);
    onChanged();
    onClose();
  }

  if (!goal) {
    return (
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white h-full shadow-xl p-6 text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  const doneCount = goal.keyResults.filter((k) => k.completed).length;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-xl overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${GOAL_LEVEL_BADGE[goal.category]}`}>
                  {GOAL_CATEGORY_LABELS[goal.category]}
                </span>
                {goal.parentGoal && (
                  <span className="text-[11px] text-slate-400">
                    aligns to <span className="font-medium text-slate-500">{goal.parentGoal.title}</span>
                  </span>
                )}
              </div>
              <div className="font-semibold text-slate-800">{goal.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {goal.employee?.fullName}
                {goal.project ? ` · ${goal.project.name} (${goal.project.client.name})` : ''}
                {goal.reviewCycle ? ` · ${goal.reviewCycle.name}` : ''}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
              Close ✕
            </button>
          </div>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>

        <div className="px-6 py-5 space-y-6">
          {goal.description && <p className="text-sm text-slate-600">{goal.description}</p>}

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Key Results ({doneCount}/{goal.keyResults.length} Done)
            </h3>
            <div className="space-y-1.5">
              {goal.keyResults.map((kr) => (
                <div key={kr.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <button
                    onClick={() => toggleKeyResult(kr)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                      kr.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                    }`}
                  >
                    {kr.completed ? '✓' : ''}
                  </button>
                  <span className={`flex-1 text-sm ${kr.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {kr.title}
                    {kr.targetValue ? ` (${kr.targetValue})` : ''}
                  </span>
                  <button onClick={() => removeKeyResult(kr)} className="text-slate-300 hover:text-red-500 text-xs">
                    ✕
                  </button>
                </div>
              ))}
              {goal.keyResults.length === 0 && <p className="text-sm text-slate-400">No key results yet.</p>}
            </div>
            <form onSubmit={addKeyResult} className="flex items-center gap-2 mt-2">
              <input
                value={newKrTitle}
                onChange={(e) => setNewKrTitle(e.target.value)}
                placeholder="Add a key result..."
                className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <input
                value={newKrTarget}
                onChange={(e) => setNewKrTarget(e.target.value)}
                placeholder="Target (optional)"
                className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={addingKr || !newKrTitle.trim()}
                className="rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50 flex-shrink-0"
              >
                {addingKr ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Progress</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-slate-700 w-10 text-right">{progress}%</span>
            </div>
            <div className="mt-2">
              <GoalProgressBar progress={progress} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              >
                {GOAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {GOAL_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={saveProgress}
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Check-in History</h3>
            {!goal.checkIns || goal.checkIns.length === 0 ? (
              <p className="text-sm text-slate-400">No check-ins logged yet.</p>
            ) : (
              <div className="space-y-2">
                {goal.checkIns.map((c) => (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{formatDate(c.checkInDate)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {c.confidence.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{c.progressUpdate}</p>
                    {c.blockers && <p className="text-xs text-rose-500 mt-1">Blocker: {c.blockers}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {goal._count && goal._count.childGoals > 0 && (
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
              {goal._count.childGoals} goal{goal._count.childGoals === 1 ? '' : 's'} aligned underneath this one.
            </p>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
              Delete goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Scorecard Drawer (360° review detail) ------------------------------------

function ScorecardDrawer({
  reviewId,
  employees,
  onClose,
  onChanged,
}: {
  reviewId: string;
  employees: Employee[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token, user } = useAuth();
  const [review, setReview] = useState<PerformanceReview | null>(null);
  const [projectContext, setProjectContext] = useState<ProjectContextAssignment[] | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[] | null>(null);
  const [error, setError] = useState('');

  const [raterId, setRaterId] = useState('');
  const [raterType, setRaterType] = useState<ReviewRaterType>('MANAGER');
  const [communicationRating, setCommunicationRating] = useState(0);
  const [technicalRating, setTechnicalRating] = useState(0);
  const [teamworkRating, setTeamworkRating] = useState(0);
  const [goalAchievementRating, setGoalAchievementRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const [overallRating, setOverallRating] = useState(0);
  const [potentialRating, setPotentialRating] = useState(0);
  const [managerSummary, setManagerSummary] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  const ratingValues: Record<string, number> = {
    communicationRating,
    technicalRating,
    teamworkRating,
    goalAchievementRating,
  };
  const ratingSetters: Record<string, (v: number) => void> = {
    communicationRating: setCommunicationRating,
    technicalRating: setTechnicalRating,
    teamworkRating: setTeamworkRating,
    goalAchievementRating: setGoalAchievementRating,
  };

  async function load() {
    if (!token) return;
    const [data, ctx] = await Promise.all([
      getPerformanceReview(token, reviewId),
      getPerformanceReviewProjectContext(token, reviewId),
    ]);
    setReview(data);
    setProjectContext(ctx);
    setOverallRating(data.overallRating || 0);
    setPotentialRating(data.potentialRating || 0);
    setManagerSummary(data.managerSummary || '');
    if (!raterId && user?.employeeId) setRaterId(user.employeeId);
    const ci = await getCheckIns(token, { employeeId: data.employeeId });
    setCheckIns(
      ci.filter((c) => {
        if (!data.reviewCycle) return true;
        const t = new Date(c.checkInDate).getTime();
        return t >= new Date(data.reviewCycle.startDate).getTime() && t <= new Date(data.reviewCycle.endDate).getTime() + 86400000;
      }),
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId, token]);

  async function refresh() {
    await load();
    onChanged();
  }

  async function submitFeedback(e: FormEvent) {
    e.preventDefault();
    if (!token || !raterId) return;
    setSavingFeedback(true);
    setError('');
    try {
      await submitReviewFeedback(token, reviewId, {
        raterId,
        raterType,
        communicationRating: communicationRating || undefined,
        technicalRating: technicalRating || undefined,
        teamworkRating: teamworkRating || undefined,
        goalAchievementRating: goalAchievementRating || undefined,
        comments: feedbackComments || undefined,
      });
      setCommunicationRating(0);
      setTechnicalRating(0);
      setTeamworkRating(0);
      setGoalAchievementRating(0);
      setFeedbackComments('');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleFinalize(e: FormEvent) {
    e.preventDefault();
    if (!token || !overallRating) return;
    setFinalizing(true);
    setError('');
    try {
      await finalizePerformanceReview(token, reviewId, {
        overallRating,
        potentialRating: potentialRating || undefined,
        managerSummary: managerSummary || undefined,
      });
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  }

  async function handleDelete() {
    if (!token || !review) return;
    if (!confirm(`Delete this performance review for ${review.employee?.fullName}?`)) return;
    await deletePerformanceReview(token, reviewId);
    onChanged();
    onClose();
  }

  if (!review) {
    return (
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-white h-full shadow-xl p-6 text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  const selfDone = review.feedback.some((f) => f.raterType === 'SELF');
  const peerCount = review.feedback.filter((f) => f.raterType === 'PEER').length;
  const managerFeedback = review.feedback.find((f) => f.raterType === 'MANAGER');
  const clientDone = review.feedback.some((f) => f.raterType === 'CLIENT');
  const managerKind: 'done' | 'partial' | 'pending' = !managerFeedback
    ? 'pending'
    : review.status === 'COMPLETED'
    ? 'done'
    : 'partial';
  const managerLabel = !managerFeedback ? 'Pending' : review.status === 'COMPLETED' ? 'Completed' : 'In Draft';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-xl overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-800">{review.employee?.fullName}</div>
              <div className="text-xs text-slate-500">
                {review.employee?.designation?.name ? `${review.employee.designation.name} · ` : ''}
                {review.reviewCycle?.name} · {formatDate(review.reviewCycle?.startDate)} –{' '}
                {formatDate(review.reviewCycle?.endDate)}
              </div>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${REVIEW_STATUS_BADGE[review.status]}`}>
                {REVIEW_STATUS_LABELS[review.status]}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
              Close ✕
            </button>
          </div>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 360° Status Matrix */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              360° Review Status Matrix
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600">Self-Assessment</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${pillTone(selfDone ? 'done' : 'pending')}`}>
                  {selfDone ? 'Submitted' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600">Peer Reviews</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${pillTone(
                    peerCount >= review.expectedPeerReviewers && review.expectedPeerReviewers > 0 ? 'done' : 'partial',
                  )}`}
                >
                  {peerCount}/{review.expectedPeerReviewers} Received
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600">Manager Evaluation</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${pillTone(managerKind)}`}>{managerLabel}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-600">Client / Stakeholder</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${pillTone(clientDone ? 'done' : 'pending')}`}>
                  {clientDone ? 'Submitted' : 'Not Requested'}
                </span>
              </div>
            </div>
          </div>

          {/* Existing feedback broken down by competency */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Feedback Breakdown ({review.feedback.length})
            </h3>
            {review.feedback.length === 0 ? (
              <p className="text-sm text-slate-400">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {review.feedback.map((f) => (
                  <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{f.rater?.fullName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RATER_TYPE_BADGE[f.raterType]}`}>
                        {RATER_TYPE_LABELS[f.raterType]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 mb-1">
                      {COMPETENCY_FIELDS.map(
                        (c) =>
                          (f as any)[c.key] != null && (
                            <span key={c.key}>
                              {c.label}: {(f as any)[c.key]}/5
                            </span>
                          ),
                      )}
                    </div>
                    {f.comments && <p className="text-sm text-slate-600">{f.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add feedback */}
          <form onSubmit={submitFeedback} className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Feedback</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rater</label>
                <select
                  required
                  value={raterId}
                  onChange={(e) => setRaterId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  <option value="">Select rater</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rater Type</label>
                <select
                  value={raterType}
                  onChange={(e) => setRaterType(e.target.value as ReviewRaterType)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                >
                  {REVIEW_RATER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {RATER_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {COMPETENCY_FIELDS.map((c) => (
              <div key={c.key} className="flex items-center justify-between">
                <label className="text-xs text-slate-500">{c.label}</label>
                <StarRatingInput value={ratingValues[c.key]} onChange={ratingSetters[c.key]} />
              </div>
            ))}
            <textarea
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              rows={2}
              placeholder="Comments"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={savingFeedback || !raterId}
              className="rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              {savingFeedback ? 'Saving...' : 'Submit Feedback'}
            </button>
          </form>

          {/* Project context — performance-to-project correlation */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Project Context During This Cycle
            </h3>
            {!projectContext || projectContext.length === 0 ? (
              <p className="text-sm text-slate-400">No project assignments overlap this review cycle.</p>
            ) : (
              <div className="space-y-1.5">
                {projectContext.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <div>
                      <span className="font-medium text-slate-700">{a.project.name}</span>
                      <span className="text-xs text-slate-400"> · {a.project.client.name}</span>
                      {a.roleOnProject && <span className="text-xs text-slate-400"> · {a.roleOnProject}</span>}
                    </div>
                    <span className="text-xs text-slate-500">{a.allocationPercent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Continuous check-in log for this cycle */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              1:1 Check-in Log ({checkIns?.length || 0})
            </h3>
            {!checkIns || checkIns.length === 0 ? (
              <p className="text-sm text-slate-400">No check-ins logged during this cycle.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {checkIns.map((c) => (
                  <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-slate-400">{formatDate(c.checkInDate)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {c.confidence.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{c.progressUpdate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finalize */}
          <form onSubmit={handleFinalize} className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {review.status === 'COMPLETED' ? 'Finalized Review' : 'Finalize Review'}
            </h3>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Overall Rating (Performance)</label>
              <StarRatingInput value={overallRating} onChange={setOverallRating} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Growth Potential</label>
              <StarRatingInput value={potentialRating} onChange={setPotentialRating} />
            </div>
            <textarea
              value={managerSummary}
              onChange={(e) => setManagerSummary(e.target.value)}
              rows={3}
              placeholder="Manager summary — shared with the employee once finalized."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={finalizing || !overallRating}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {finalizing ? 'Saving...' : review.status === 'COMPLETED' ? 'Update Manager Sign-off' : 'Finalize Review'}
            </button>
            {review.status === 'COMPLETED' && (
              <p className="text-xs text-slate-400">
                {review.employeeAcknowledged
                  ? `Acknowledged by employee on ${formatDate(review.acknowledgedAt)}.`
                  : 'Employee has not acknowledged this review yet.'}
              </p>
            )}
          </form>

          <div className="pt-2 border-t border-slate-100">
            <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
              Delete review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main page -----------------------------------------------------------------

type Section = 'okrs' | 'appraisals';
const SECTION_TABS: TabBarItem<Section>[] = [
  { key: 'okrs', label: 'OKRs & Reviews', color: 'indigo' },
  { key: 'appraisals', label: 'Appraisals', color: 'amber' },
];

export default function AdminPerformance() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('tab');
  const [section, setSection] = useState<Section>(requestedSection === 'appraisals' ? 'appraisals' : 'okrs');
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<'goals' | 'reviews' | 'insights'>('goals');
  const [cycleFilter, setCycleFilter] = useState('');
  const [goalStatusFilter, setGoalStatusFilter] = useState<GoalStatus | 'ALL'>('ALL');

  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showInitiateReview, setShowInitiateReview] = useState(false);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    try {
      const [cyc, gls, revs, emps, projs] = await Promise.all([
        getReviewCycles(token),
        getGoals(token),
        getPerformanceReviews(token),
        getEmployees(token),
        getProjects(token),
      ]);
      setCycles(cyc);
      setGoals(gls);
      setReviews(revs);
      setEmployees(emps);
      setProjects(projs);
      if (!cycleFilter) {
        const active = cyc.find((c) => c.status === 'ACTIVE');
        if (active) setCycleFilter(active.id);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCycleStatusChange(cycle: ReviewCycle, status: ReviewCycleStatus) {
    if (!token) return;
    await updateReviewCycle(token, cycle.id, { status });
    load();
  }

  async function handleDeleteCycle(cycle: ReviewCycle) {
    if (!token) return;
    const counts = cycle._count;
    const warning =
      counts && (counts.goals > 0 || counts.reviews > 0)
        ? `Delete "${cycle.name}"? This cycle has ${counts.goals} goal(s) and ${counts.reviews} review(s) linked to it.`
        : `Delete "${cycle.name}"?`;
    if (!confirm(warning)) return;
    await deleteReviewCycle(token, cycle.id);
    load();
  }

  async function handleDeleteGoal(goal: Goal) {
    if (!token) return;
    if (!confirm(`Delete goal "${goal.title}" for ${goal.employee?.fullName}?`)) return;
    await deleteGoal(token, goal.id);
    load();
  }

  const filteredGoals = goals.filter((g) => {
    if (cycleFilter && g.reviewCycleId !== cycleFilter) return false;
    if (goalStatusFilter !== 'ALL' && g.status !== goalStatusFilter) return false;
    return true;
  });

  const filteredReviews = reviews.filter((r) => (cycleFilter ? r.reviewCycleId === cycleFilter : true));
  const activeCycle = cycles.find((c) => c.status === 'ACTIVE');

  const kpis = useMemo(() => {
    const activeGoals = filteredGoals.filter((g) => g.status !== 'COMPLETED').length;
    const avgProgress =
      filteredGoals.length === 0
        ? 0
        : Math.round(filteredGoals.reduce((sum, g) => sum + g.progress, 0) / filteredGoals.length);
    const reviewsInProgress = filteredReviews.filter((r) => r.status === 'IN_PROGRESS').length;
    const reviewsCompleted = filteredReviews.filter((r) => r.status === 'COMPLETED').length;
    return { activeGoals, avgProgress, reviewsInProgress, reviewsCompleted };
  }, [filteredGoals, filteredReviews]);

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Performance & Goals</h1>
          <p className="text-sm text-slate-500 mt-1">
            OKR alignment, continuous check-ins, and 360° multi-rater performance reviews.
          </p>
        </div>
      </div>

      <TabBar tabs={SECTION_TABS} active={section} onChange={setSection} />

      {section === 'appraisals' && <AdminAppraisalDashboard />}

      {section === 'okrs' && (
        <>
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Couldn't load performance data: {loadError}
        </div>
      )}

      <ActiveCycleBanner cycle={activeCycle} onLaunchNew={() => setShowNewCycle(true)} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Goals" value={kpis.activeGoals} color="indigo" icon={TargetIcon} />
        <KpiCard label="Avg Goal Progress" value={`${kpis.avgProgress}%`} color="sky" icon={ChartBarIcon} />
        <KpiCard label="Reviews In Progress" value={kpis.reviewsInProgress} color="fuchsia" icon={ClockIcon} />
        <KpiCard label="Reviews Completed" value={kpis.reviewsCompleted} color="emerald" icon={TrophyIcon} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Review Cycles</h2>
          <button
            onClick={() => setShowNewCycle(true)}
            className="rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium px-3 py-1.5 hover:bg-slate-50"
          >
            + New Cycle
          </button>
        </div>
        {cycles.length === 0 ? (
          <p className="text-sm text-slate-500">No review cycles yet — create one to start setting goals.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {cycles.map((c) => (
              <div key={c.id} className="flex-shrink-0 w-64 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-800 text-sm">{c.name}</div>
                  <button onClick={() => handleDeleteCycle(c)} className="text-slate-300 hover:text-red-500 text-xs">
                    ✕
                  </button>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {formatDate(c.startDate)} – {formatDate(c.endDate)}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <select
                    value={c.status}
                    onChange={(e) => handleCycleStatusChange(c, e.target.value as ReviewCycleStatus)}
                    className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${CYCLE_STATUS_BADGE[c.status]}`}
                  >
                    {REVIEW_CYCLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">
                    {c._count?.goals || 0} goals · {c._count?.reviews || 0} reviews
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          <button
            onClick={() => setTab('goals')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === 'goals' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Goals
          </button>
          <button
            onClick={() => setTab('reviews')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === 'reviews' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setTab('insights')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              tab === 'insights' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Insights
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">All cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {tab === 'goals' && (
            <button
              onClick={() => setShowNewGoal(true)}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              + New Goal
            </button>
          )}
          {tab === 'reviews' && (
            <button
              onClick={() => setShowInitiateReview(true)}
              disabled={cycles.length === 0}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              + Initiate Review
            </button>
          )}
        </div>
      </div>

      {tab === 'goals' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <select
              value={goalStatusFilter}
              onChange={(e) => setGoalStatusFilter(e.target.value as GoalStatus | 'ALL')}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="ALL">All statuses</option>
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GOAL_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <GoalAlignmentTree goals={filteredGoals} onOpen={setOpenGoalId} onDelete={handleDeleteGoal} />
        </div>
      )}

      {tab === 'reviews' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {filteredReviews.length === 0 ? (
            <p className="text-slate-500 text-sm">No performance reviews match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Employee & Role</th>
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium">Self-Review</th>
                    <th className="pb-2 font-medium">Peer Reviews</th>
                    <th className="pb-2 font-medium">Manager Review</th>
                    <th className="pb-2 font-medium">Final Rating</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((r) => {
                    const selfDone = r.feedback.some((f) => f.raterType === 'SELF');
                    const peerCount = r.feedback.filter((f) => f.raterType === 'PEER').length;
                    const managerFeedback = r.feedback.find((f) => f.raterType === 'MANAGER');
                    const managerKind: 'done' | 'partial' | 'pending' = !managerFeedback
                      ? 'pending'
                      : r.status === 'COMPLETED'
                      ? 'done'
                      : 'partial';
                    const managerLabel = !managerFeedback ? 'Pending' : r.status === 'COMPLETED' ? 'Completed' : 'In Draft';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <div className="text-slate-700 font-medium">{r.employee?.fullName}</div>
                          {r.employee?.designation?.name && (
                            <div className="text-xs text-slate-400">{r.employee.designation.name}</div>
                          )}
                        </td>
                        <td className="py-2.5 text-slate-500">{r.employee?.department?.name || '—'}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pillTone(selfDone ? 'done' : 'pending')}`}>
                            {selfDone ? 'Submitted' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${pillTone(
                              peerCount >= r.expectedPeerReviewers && r.expectedPeerReviewers > 0 ? 'done' : 'partial',
                            )}`}
                          >
                            {peerCount}/{r.expectedPeerReviewers} Received
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pillTone(managerKind)}`}>{managerLabel}</span>
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {typeof r.overallRating === 'number' ? (
                            <span className="flex items-center gap-0.5 text-amber-500">
                              <StarIcon filled className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">{r.overallRating}/5</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setOpenReviewId(r.id)}
                            className="text-xs text-mitra-accentFrom hover:underline"
                          >
                            View Scorecard
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
      )}

      {tab === 'insights' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <GridIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Performance vs. Potential (9-Box Grid)</h2>
          </div>
          <NineBoxGrid reviews={filteredReviews} />
        </div>
      )}

      {showNewCycle && <NewCycleModal onClose={() => setShowNewCycle(false)} onCreated={load} />}
      {showNewGoal && (
        <NewGoalModal
          employees={employees}
          cycles={cycles}
          goals={goals}
          projects={projects}
          onClose={() => setShowNewGoal(false)}
          onCreated={load}
        />
      )}
      {showInitiateReview && (
        <InitiateReviewModal
          employees={employees}
          cycles={cycles}
          defaultCycleId={cycleFilter || undefined}
          onClose={() => setShowInitiateReview(false)}
          onCreated={load}
        />
      )}
      {openGoalId && (
        <GoalDetailDrawer goalId={openGoalId} onClose={() => setOpenGoalId(null)} onChanged={load} />
      )}
      {openReviewId && (
        <ScorecardDrawer
          reviewId={openReviewId}
          employees={employees}
          onClose={() => setOpenReviewId(null)}
          onChanged={load}
        />
      )}
        </>
      )}
    </div>
  );
}
