import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getReviewCycles,
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  createCheckIn,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  getCheckIns,
  getProjects,
  getPerformanceReviews,
  submitReviewFeedback,
  acknowledgePerformanceReview,
} from '../../lib/api';
import {
  ReviewCycle,
  Goal,
  GoalStatus,
  GoalCategory,
  KeyResult,
  CheckIn,
  CheckInConfidence,
  Project,
  GOAL_STATUSES,
  GOAL_CATEGORIES,
  CHECK_IN_CONFIDENCE_LEVELS,
  PerformanceReview,
} from '../../types';
import { TargetIcon, StarIcon, TrophyIcon, ClockIcon } from '../../components/icons';
import Progress3DBar from '../../components/Progress3DBar';
import SelfAppraisalSection from '../../components/SelfAppraisalSection';

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

// TEAM displays as "Department" — same relabeling precedent used across the
// app (Recruitment's FINAL_ROUND -> "Client Round", AdminPerformance's same
// GOAL_CATEGORY_LABELS). DB value stays TEAM.
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

const CONFIDENCE_LABELS: Record<CheckInConfidence, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  OFF_TRACK: 'Off Track',
};

const CONFIDENCE_BADGE: Record<CheckInConfidence, string> = {
  ON_TRACK: 'bg-emerald-100 text-emerald-700',
  AT_RISK: 'bg-amber-100 text-amber-700',
  OFF_TRACK: 'bg-rose-100 text-rose-700',
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

// Same 4 competency labels as the admin scorecard, for consistency between
// the self-review form here and what a manager sees on the other side.
const COMPETENCY_FIELDS: {
  key: 'technicalRating' | 'communicationRating' | 'teamworkRating' | 'goalAchievementRating';
  label: string;
}[] = [
  { key: 'technicalRating', label: 'Technical Execution' },
  { key: 'communicationRating', label: 'Client Communication' },
  { key: 'teamworkRating', label: 'Leadership & Teamwork' },
  { key: 'goalAchievementRating', label: 'Goal Achievement' },
];

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Red <40%, Yellow 40-70%, Green >70% — same color coding as the admin view.
function progressBarColor(pct: number) {
  if (pct > 70) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
  if (pct >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-600';
  return 'bg-gradient-to-r from-rose-400 to-rose-600';
}

function GoalProgressBar({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-2">
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

function NewGoalModal({
  cycles,
  goals,
  projects,
  onClose,
  onCreated,
}: {
  cycles: ReviewCycle[];
  goals: Goal[];
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
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
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await createGoal(token, {
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
            <label className="block text-xs text-slate-500 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="e.g. Complete AWS Certification"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="What does success look like?"
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

function GoalDrawer({ goalId, onClose, onChanged }: { goalId: string; onClose: () => void; onChanged: () => void }) {
  const { token } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GoalStatus>('NOT_STARTED');
  const [savingGoal, setSavingGoal] = useState(false);
  const [checkInText, setCheckInText] = useState('');
  const [blockers, setBlockers] = useState('');
  const [confidence, setConfidence] = useState<CheckInConfidence>('ON_TRACK');
  const [savingCheckIn, setSavingCheckIn] = useState(false);
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
    setSavingGoal(true);
    setError('');
    try {
      await updateGoal(token, goalId, { progress, status });
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingGoal(false);
    }
  }

  async function addCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!token || !checkInText.trim()) return;
    setSavingCheckIn(true);
    setError('');
    try {
      await createCheckIn(token, { goalId, progressUpdate: checkInText, blockers: blockers || undefined, confidence });
      setCheckInText('');
      setBlockers('');
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCheckIn(false);
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
                {goal.project ? `${goal.project.name} (${goal.project.client.name})` : ''}
                {goal.reviewCycle ? ` · ${goal.reviewCycle.name}` : ''}
                {goal.dueDate ? ` · Target ${formatDate(goal.dueDate)}` : ''}
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
                disabled={savingGoal}
                className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {savingGoal ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Log a Check-in</h3>
            <form onSubmit={addCheckIn} className="space-y-2">
              <textarea
                value={checkInText}
                onChange={(e) => setCheckInText(e.target.value)}
                rows={2}
                placeholder="What progress did you make?"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <input
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Any blockers? (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <div className="flex items-center justify-between">
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value as CheckInConfidence)}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  {CHECK_IN_CONFIDENCE_LEVELS.map((c) => (
                    <option key={c} value={c}>
                      {CONFIDENCE_LABELS[c]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={savingCheckIn || !checkInText.trim()}
                  className="rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                >
                  {savingCheckIn ? 'Logging...' : 'Add Check-in'}
                </button>
              </div>
            </form>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_BADGE[c.confidence]}`}>
                        {CONFIDENCE_LABELS[c.confidence]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{c.progressUpdate}</p>
                    {c.blockers && <p className="text-xs text-rose-500 mt-1">Blocker: {c.blockers}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

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

function ReviewDrawer({
  review,
  onClose,
  onChanged,
}: {
  review: PerformanceReview;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token, user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;
  const myFeedback = review.feedback.find((f) => f.raterType === 'SELF' && f.raterId === myEmployeeId);

  const [communicationRating, setCommunicationRating] = useState(myFeedback?.communicationRating || 0);
  const [technicalRating, setTechnicalRating] = useState(myFeedback?.technicalRating || 0);
  const [teamworkRating, setTeamworkRating] = useState(myFeedback?.teamworkRating || 0);
  const [goalAchievementRating, setGoalAchievementRating] = useState(myFeedback?.goalAchievementRating || 0);
  const [comments, setComments] = useState(myFeedback?.comments || '');
  const [saving, setSaving] = useState(false);
  const [acking, setAcking] = useState(false);
  const [error, setError] = useState('');

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

  async function submitSelfReview(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await submitReviewFeedback(token, review.id, {
        raterType: 'SELF',
        communicationRating: communicationRating || undefined,
        technicalRating: technicalRating || undefined,
        teamworkRating: teamworkRating || undefined,
        goalAchievementRating: goalAchievementRating || undefined,
        comments: comments || undefined,
      });
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAcknowledge() {
    if (!token) return;
    setAcking(true);
    setError('');
    try {
      await acknowledgePerformanceReview(token, review.id);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcking(false);
    }
  }

  const peerCount = review.feedback.filter((f) => f.raterType === 'PEER').length;
  const managerFeedback = review.feedback.find((f) => f.raterType === 'MANAGER');

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-xl overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-800">{review.reviewCycle?.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {formatDate(review.reviewCycle?.startDate)} – {formatDate(review.reviewCycle?.endDate)}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
              Close ✕
            </button>
          </div>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-slate-600">Self-Assessment</span>
              <span className={`px-2 py-0.5 rounded-full ${myFeedback ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {myFeedback ? 'Submitted' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-slate-600">Peer Reviews</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {peerCount}/{review.expectedPeerReviewers} Received
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 col-span-2">
              <span className="text-slate-600">Manager Evaluation</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  review.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : managerFeedback
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {review.status === 'COMPLETED' ? 'Completed' : managerFeedback ? 'In Draft' : 'Pending'}
              </span>
            </div>
          </div>

          {review.status === 'COMPLETED' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrophyIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Overall Rating: {review.overallRating}/5
                </span>
              </div>
              {review.managerSummary && <p className="text-sm text-emerald-800">{review.managerSummary}</p>}
              {!review.employeeAcknowledged ? (
                <button
                  onClick={handleAcknowledge}
                  disabled={acking}
                  className="mt-3 rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                >
                  {acking ? 'Acknowledging...' : 'Acknowledge Review'}
                </button>
              ) : (
                <p className="text-xs text-emerald-600 mt-2">Acknowledged on {formatDate(review.acknowledgedAt)}.</p>
              )}
            </div>
          )}

          <form onSubmit={submitSelfReview} className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {myFeedback ? 'Your Self-Review (submitted)' : 'Submit Your Self-Review'}
            </h3>
            {COMPETENCY_FIELDS.map((c) => (
              <div key={c.key} className="flex items-center justify-between">
                <label className="text-xs text-slate-500">{c.label}</label>
                <StarRatingInput value={ratingValues[c.key]} onChange={ratingSetters[c.key]} />
              </div>
            ))}
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Reflect on this period — highlights, challenges, what you'd like support with."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Saving...' : myFeedback ? 'Update Self-Review' : 'Submit Self-Review'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Compact OKR-style card for the goals list — same visual language as the
// admin GoalCard (level badge, aligned project, key results checklist,
// color-coded progress bar) so an employee sees the same shape of card the
// admin scorecard is built from.
function MyGoalCard({ goal, onOpen }: { goal: Goal; onOpen: (id: string) => void }) {
  const doneCount = goal.keyResults.filter((k) => k.completed).length;
  const totalCount = goal.keyResults.length;
  return (
    <button
      onClick={() => onOpen(goal.id)}
      className="w-full text-left border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 hover:shadow-sm transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${GOAL_LEVEL_BADGE[goal.category]}`}>
            {GOAL_CATEGORY_LABELS[goal.category]}
          </span>
          <span className="font-medium text-slate-700 text-sm truncate">{goal.title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${GOAL_STATUS_BADGE[goal.status]}`}>
          {GOAL_STATUS_LABELS[goal.status]}
        </span>
      </div>
      <div className="text-xs text-slate-400 mb-1.5">
        {goal.project ? `${goal.project.name} (${goal.project.client.name})` : goal.parentGoal ? `Aligns to ${goal.parentGoal.title}` : ''}
      </div>
      {totalCount > 0 && (
        <div className="space-y-1 mb-2">
          {goal.keyResults.slice(0, 3).map((kr) => (
            <div key={kr.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${
                  kr.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                }`}
              >
                {kr.completed ? '✓' : ''}
              </span>
              <span className={kr.completed ? 'line-through text-slate-400' : ''}>{kr.title}</span>
            </div>
          ))}
          <div className="text-[11px] text-slate-400 font-medium">
            {doneCount}/{totalCount} Key Results Done
          </div>
        </div>
      )}
      <GoalProgressBar progress={goal.progress} />
      <div className="text-xs text-slate-400 mt-1.5">
        {goal.dueDate ? `Target: ${formatDate(goal.dueDate)}` : 'No target date'} · {goal._count?.checkIns || 0} check-in
        {goal._count?.checkIns === 1 ? '' : 's'}
      </div>
    </button>
  );
}

export default function MyPerformance() {
  const { token, user } = useAuth();
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [checkInFeed, setCheckInFeed] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  const myEmployeeId = user?.employeeId || user?.id;

  async function load() {
    if (!token || !myEmployeeId) return;
    setLoading(true);
    setLoadError('');
    try {
      const [cyc, gls, revs, projs, feed] = await Promise.all([
        getReviewCycles(token),
        getGoals(token, { employeeId: myEmployeeId }),
        getPerformanceReviews(token, { employeeId: myEmployeeId }),
        getProjects(token),
        getCheckIns(token, { employeeId: myEmployeeId }),
      ]);
      setCycles(cyc);
      setGoals(gls);
      setReviews(revs);
      setProjects(projs);
      setCheckInFeed(feed.slice(0, 15));
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load performance data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, myEmployeeId]);

  const activeCycle = cycles.find((c) => c.status === 'ACTIVE');
  const openReview = reviews.find((r) => r.id === openReviewId) || null;

  const avgProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
  }, [goals]);

  const goalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    goals.forEach((g) => map.set(g.id, g.title));
    return map;
  }, [goals]);

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">My Performance</h1>
          <p className="text-sm text-slate-500 mt-1">Your OKRs, continuous check-ins, and performance reviews.</p>
        </div>
        <button
          onClick={() => setShowNewGoal(true)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + New Goal
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Couldn't load performance data: {loadError}
        </div>
      )}

      {activeCycle && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <TargetIcon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <p className="text-sm text-indigo-700">
            Current review cycle: <span className="font-medium">{activeCycle.name}</span> ({formatDate(activeCycle.startDate)}{' '}
            – {formatDate(activeCycle.endDate)})
          </p>
        </div>
      )}

      <SelfAppraisalSection />

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">My OKRs</h2>
          <span className="text-xs text-slate-400">{goals.length} goal{goals.length === 1 ? '' : 's'} · avg {avgProgress}% complete</span>
        </div>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-500">No goals yet — set your first one to start tracking progress.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <MyGoalCard key={g.id} goal={g} onOpen={setOpenGoalId} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Continuous Check-in Timeline</h2>
        </div>
        {checkInFeed.length === 0 ? (
          <p className="text-sm text-slate-500">
            No check-ins logged yet — log one from a goal to start building your year-round record.
          </p>
        ) : (
          <div className="space-y-2">
            {checkInFeed.map((c) => (
              <div key={c.id} className="flex gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="w-1.5 rounded-full flex-shrink-0 bg-mitra-accentFrom/40" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {c.goalId ? goalTitleById.get(c.goalId) || 'Goal' : 'General check-in'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CONFIDENCE_BADGE[c.confidence]}`}>
                        {CONFIDENCE_LABELS[c.confidence]}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDate(c.checkInDate)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">{c.progressUpdate}</p>
                  {c.blockers && <p className="text-xs text-rose-500 mt-1">Blocker: {c.blockers}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">My Performance Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No performance reviews yet.</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => setOpenReviewId(r.id)}
                className="w-full text-left flex items-center justify-between border border-slate-200 rounded-lg p-3 hover:border-mitra-accentFrom/40 hover:shadow-sm transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-700 text-sm">{r.reviewCycle?.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {formatDate(r.reviewCycle?.startDate)} – {formatDate(r.reviewCycle?.endDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'COMPLETED' && typeof r.overallRating === 'number' && (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <StarIcon filled className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{r.overallRating}/5</span>
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_BADGE[r.status]}`}>
                    {REVIEW_STATUS_LABELS[r.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showNewGoal && (
        <NewGoalModal cycles={cycles} goals={goals} projects={projects} onClose={() => setShowNewGoal(false)} onCreated={load} />
      )}
      {openGoalId && <GoalDrawer goalId={openGoalId} onClose={() => setOpenGoalId(null)} onChanged={load} />}
      {openReview && <ReviewDrawer review={openReview} onClose={() => setOpenReviewId(null)} onChanged={load} />}
    </div>
  );
}
