import { FormEvent, useEffect, useMemo, useState } from 'react';
import { HUE_GRADIENTS, TOGGLE_3D_INACTIVE, toggle3dActive } from '../../lib/buttonStyles';
import { TILE_THEMES } from '../../lib/tileThemes';
import Progress3DBar from '../../components/Progress3DBar';
import { useAuth } from '../../context/AuthContext';
import {
  getEmployees,
  getDepartments,
  getRecognitions,
  getRecognitionLeaderboard,
  createRecognition,
  deleteRecognition,
  addRecognitionReaction,
  removeRecognitionReaction,
  getRecognitionComments,
  addRecognitionComment,
  deleteRecognitionComment,
  getPulseSurveys,
  getPulseSurvey,
  getPulseSurveyResults,
  getPulseSurveyInsights,
  createPulseSurvey,
  updatePulseSurvey,
  deletePulseSurvey,
  submitPulseSurveyResponse,
  API_BASE,
} from '../../lib/api';
import {
  Employee,
  LookupItem,
  Recognition,
  RecognitionCategory,
  RECOGNITION_CATEGORIES,
  RecognitionEmployeeRef,
  RecognitionReactionType,
  RECOGNITION_REACTION_TYPES,
  RECOGNITION_POINT_OPTIONS,
  RecognitionComment,
  RecognitionLeaderboardEntry,
  PulseSurvey,
  PulseSurveyDetail,
  PulseSurveyResults,
  PulseSurveyInsights,
  PulseFeedbackSentiment,
  PulseSurveyAudienceType,
  PulseQuestionType,
  PULSE_QUESTION_TYPES,
  PulseQuestionInput,
  PulseAnswerInput,
} from '../../types';
import { HeartIcon, TrophyIcon, ClipboardListIcon, XIcon, StarIcon } from '../../components/icons';

// --- Labels & badges --------------------------------------------------------

const CATEGORY_LABELS: Record<RecognitionCategory, string> = {
  TEAMWORK: 'Teamwork',
  CLIENT_IMPACT: 'Client Impact',
  INNOVATION: 'Innovation',
  LEADERSHIP: 'Leadership',
  GOING_ABOVE_AND_BEYOND: 'Above & Beyond',
};
const CATEGORY_BADGE: Record<RecognitionCategory, string> = {
  TEAMWORK: 'bg-sky-100 text-sky-700',
  CLIENT_IMPACT: 'bg-fuchsia-100 text-fuchsia-700',
  INNOVATION: 'bg-amber-100 text-amber-700',
  LEADERSHIP: 'bg-indigo-100 text-indigo-700',
  GOING_ABOVE_AND_BEYOND: 'bg-emerald-100 text-emerald-700',
};
// 3D gradient version of the same hues, for the active state of the
// category picker / filter pills (toggle3dActive from lib/buttonStyles).
const CATEGORY_GRADIENT: Record<RecognitionCategory, string> = {
  TEAMWORK: HUE_GRADIENTS.sky,
  CLIENT_IMPACT: HUE_GRADIENTS.fuchsia,
  INNOVATION: HUE_GRADIENTS.amber,
  LEADERSHIP: HUE_GRADIENTS.indigo,
  GOING_ABOVE_AND_BEYOND: HUE_GRADIENTS.emerald,
};

const SURVEY_STATUS_LABELS: Record<string, string> = { DRAFT: 'Draft', ACTIVE: 'Active', CLOSED: 'Closed' };
const SURVEY_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-200 text-slate-500',
};

const QUESTION_TYPE_LABELS: Record<PulseQuestionType, string> = {
  RATING: '1-5 Rating',
  YES_NO: 'Yes / No',
  TEXT: 'Free Response',
};

const REACTION_EMOJI: Record<RecognitionReactionType, string> = {
  LIKE: '❤️',
  CLAP: '👏',
  FIRE: '🔥',
  ROCKET: '🚀',
};
const REACTION_LABELS: Record<RecognitionReactionType, string> = {
  LIKE: 'Like',
  CLAP: 'Clap',
  FIRE: 'Fire',
  ROCKET: 'Rocket',
};

// #1 Gold / #2 Silver / #3 Bronze — rank medallions for the leaderboard.
const RANK_MEDALS = ['🥇', '🥈', '🥉'];
// 3D gold / silver / bronze themes for the top-3 leaderboard cards —
// everyone past #3 cycles through the app's shared tile palette instead of
// a flat white card, per house style (every card carries color).
const RANK_3D_THEME = [
  { bg: 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500', shadow: 'shadow-[0_10px_24px_-8px_rgba(217,119,6,0.6)]' },
  { bg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500', shadow: 'shadow-[0_10px_24px_-8px_rgba(100,116,139,0.55)]' },
  { bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-amber-700', shadow: 'shadow-[0_10px_24px_-8px_rgba(194,65,12,0.55)]' },
];

const SENTIMENT_LABELS: Record<PulseFeedbackSentiment, string> = {
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  NEEDS_ATTENTION: 'Needs Attention',
};
const SENTIMENT_BADGE: Record<PulseFeedbackSentiment, string> = {
  POSITIVE: 'bg-emerald-100 text-emerald-700',
  NEUTRAL: 'bg-slate-100 text-slate-600',
  NEEDS_ATTENTION: 'bg-rose-100 text-rose-700',
};
const SENTIMENT_DOT: Record<PulseFeedbackSentiment, string> = {
  POSITIVE: 'bg-emerald-500',
  NEUTRAL: 'bg-slate-400',
  NEEDS_ATTENTION: 'bg-rose-500',
};

// eNPS sentiment status color — reuses this app's established
// red/amber/green convention (see rateColor below), never a rainbow.
function enpsColor(label: 'Healthy' | 'Needs Attention' | 'Critical') {
  if (label === 'Healthy') return { text: 'text-emerald-600', bg: 'bg-emerald-100', ring: 'ring-emerald-200', bar: 'bg-emerald-500' };
  if (label === 'Needs Attention') return { text: 'text-amber-600', bg: 'bg-amber-100', ring: 'ring-amber-200', bar: 'bg-amber-500' };
  return { text: 'text-rose-600', bg: 'bg-rose-100', ring: 'ring-rose-200', bar: 'bg-rose-500' };
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Same red<40 / yellow 40-70 / green>70 color convention as Performance &
// Goals, applied here to survey response-rate.
function rateColor(pct: number) {
  if (pct > 70) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
  if (pct >= 40) return 'bg-gradient-to-r from-amber-400 to-amber-600';
  return 'bg-gradient-to-r from-rose-400 to-rose-600';
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex-1">
      <Progress3DBar percent={pct} fillClassName={rateColor(pct)} height="h-1.5" />
    </div>
  );
}

// ============================================================================
// RECOGNITION ("KUDOS") TAB
// ============================================================================

function RecognitionLeaderboard({
  entries,
  onSelect,
}: {
  entries: RecognitionLeaderboardEntry[];
  onSelect: (employee: RecognitionEmployeeRef) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrophyIcon className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-700">Top Recognized This Month</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {entries.map((e, i) => {
          const isTopThree = i < 3;
          const themeBg = isTopThree ? RANK_3D_THEME[i].bg : TILE_THEMES[i % TILE_THEMES.length].tileBg;
          const themeShadow = isTopThree ? RANK_3D_THEME[i].shadow : TILE_THEMES[i % TILE_THEMES.length].tileShadow;
          return (
            <button
              key={e.employee.id}
              onClick={() => onSelect(e.employee)}
              className={`flex-shrink-0 w-40 rounded-2xl p-3 pt-5 text-center text-left border border-white/10 ${themeBg} ${themeShadow} transition-all duration-150 ease-out hover:-translate-y-1 active:translate-y-0`}
            >
              <div className="relative inline-block mx-auto">
                {e.employee.photoUrl ? (
                  <img src={`${API_BASE}${e.employee.photoUrl}`} alt="" className="w-12 h-12 rounded-full object-cover mx-auto ring-2 ring-white/50" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/25 text-white flex items-center justify-center mx-auto text-sm font-semibold ring-2 ring-white/50">
                    {e.employee.fullName.charAt(0)}
                  </div>
                )}
                {isTopThree && (
                  <span className="absolute -top-5 -right-4 text-3xl leading-none drop-shadow-md" title={`#${i + 1}`}>
                    {RANK_MEDALS[i]}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-center">
                {isTopThree && <span className="text-[10px] font-bold text-white/80">#{i + 1}</span>}
                <div className="text-xs font-semibold text-white truncate">{e.employee.fullName}</div>
              </div>
              <div className="text-[11px] text-white/80 text-center">
                {e.count} kudos{e.count === 1 ? '' : ''}
              </div>
              {e.points > 0 && (
                <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-white bg-white/25 rounded-full px-2 py-0.5 mx-auto">
                  <StarIcon className="w-2.5 h-2.5" /> {e.points} pts
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GiveKudosModal({
  token,
  employees,
  myEmployeeId,
  onClose,
  onCreated,
}: {
  token: string;
  employees: Employee[];
  myEmployeeId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [category, setCategory] = useState<RecognitionCategory>('TEAMWORK');
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const candidates = employees.filter((e) => e.id !== myEmployeeId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!toEmployeeId || !message.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createRecognition(token, { toEmployeeId, category, message: message.trim(), points });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post kudos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Give Kudos</h2>
          <button onClick={onClose}>
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Colleague</label>
            <select
              required
              value={toEmployeeId}
              onChange={(e) => setToEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Select colleague</option>
              {candidates.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Core Value</label>
            <div className="flex flex-wrap gap-1.5">
              {RECOGNITION_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    category === c ? toggle3dActive(CATEGORY_GRADIENT[c]) : TOGGLE_3D_INACTIVE
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Message</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="What did they do that deserves a shout-out?"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Reward Points (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {RECOGNITION_POINT_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPoints(p)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    points === p
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {p === 0 ? 'None' : <>
                    <StarIcon className="w-3 h-3" /> {p}
                  </>}
                </button>
              ))}
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
              {saving ? 'Posting...' : 'Give Kudos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecognitionCard({
  token,
  recognition,
  isStaff,
  myEmployeeId,
  onChanged,
}: {
  token: string;
  recognition: Recognition;
  isStaff: boolean;
  myEmployeeId: string | null;
  onChanged: () => void;
}) {
  const [reactions, setReactions] = useState(recognition.reactions);
  const [myReactions, setMyReactions] = useState<RecognitionReactionType[]>(recognition.myReactions);
  const [reactionBusy, setReactionBusy] = useState<RecognitionReactionType | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState<RecognitionComment[]>([]);
  const [newComment, setNewComment] = useState('');

  async function toggleReaction(type: RecognitionReactionType) {
    if (reactionBusy) return;
    const active = myReactions.includes(type);
    setReactionBusy(type);
    // Optimistic update — same best-effort precedent as AnnouncementCard.
    setMyReactions((prev) => (active ? prev.filter((t) => t !== type) : [...prev, type]));
    setReactions((prev) => prev.map((r) => (r.type === type ? { ...r, count: Math.max(0, r.count + (active ? -1 : 1)) } : r)));
    try {
      if (active) await removeRecognitionReaction(token, recognition.id, type);
      else await addRecognitionReaction(token, recognition.id, type);
    } catch {
      // Roll back on failure.
      setMyReactions((prev) => (active ? [...prev, type] : prev.filter((t) => t !== type)));
      setReactions((prev) => prev.map((r) => (r.type === type ? { ...r, count: Math.max(0, r.count + (active ? 1 : -1)) } : r)));
    } finally {
      setReactionBusy(null);
    }
  }

  async function toggleComments() {
    setCommentsOpen((o) => !o);
    if (!commentsLoaded) {
      try {
        setComments(await getRecognitionComments(token, recognition.id));
      } finally {
        setCommentsLoaded(true);
      }
    }
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    const created = await addRecognitionComment(token, recognition.id, newComment.trim());
    setComments((c) => [...c, created]);
    setNewComment('');
  }

  async function handleDelete() {
    if (!window.confirm('Delete this kudos post?')) return;
    await deleteRecognition(token, recognition.id);
    onChanged();
  }

  const canDelete = isStaff || recognition.fromEmployee.id === myEmployeeId;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm">
          <span className="font-medium text-slate-800">{recognition.fromEmployee.fullName}</span>
          <span className="text-slate-400"> gave kudos to </span>
          <span className="font-medium text-slate-800">{recognition.toEmployee.fullName}</span>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0">
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_BADGE[recognition.category]}`}>
          {CATEGORY_LABELS[recognition.category]}
        </span>
        {recognition.points > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <StarIcon className="w-2.5 h-2.5" /> +{recognition.points} pts
          </span>
        )}
        <span className="text-[11px] text-slate-400">{formatDate(recognition.createdAt)}</span>
      </div>
      <p className="text-sm text-slate-700">{recognition.message}</p>
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 flex-wrap">
        {RECOGNITION_REACTION_TYPES.map((type) => {
          const count = reactions.find((r) => r.type === type)?.count || 0;
          const active = myReactions.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleReaction(type)}
              disabled={reactionBusy === type}
              title={REACTION_LABELS[type]}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border transition-colors ${
                active ? 'bg-rose-50 border-rose-200 text-rose-600 font-medium' : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>{REACTION_EMOJI[type]}</span> {count > 0 ? count : ''}
            </button>
          );
        })}
        <button onClick={toggleComments} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-full hover:bg-slate-50 ml-auto">
          💬 {recognition.commentCount > 0 ? recognition.commentCount : ''} Comment{recognition.commentCount === 1 ? '' : 's'}
        </button>
      </div>
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium text-slate-700">{c.employee.fullName}</span>{' '}
              <span className="text-slate-400">{formatDate(c.createdAt)}</span>
              <p className="text-slate-600 mt-0.5">{c.body}</p>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Write a comment…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
            <button onClick={submitComment} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Drawer opened from a leaderboard card — shows every kudos a given
// employee has received: who gave it, the message, and its comments.
// Reuses RecognitionCard as-is so reactions/comments stay fully
// interactive here too, not just a read-only summary.
function EmployeeKudosDrawer({
  token,
  employee,
  isStaff,
  myEmployeeId,
  onClose,
}: {
  token: string;
  employee: RecognitionEmployeeRef;
  isStaff: boolean;
  myEmployeeId: string | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Recognition[] | null>(null);
  const [error, setError] = useState('');

  function load() {
    getRecognitions(token, { toEmployeeId: employee.id })
      .then(setItems)
      .catch((err: any) => setError(err.message || 'Failed to load kudos.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, token]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-xl overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {employee.photoUrl ? (
              <img src={`${API_BASE}${employee.photoUrl}`} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                {employee.fullName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{employee.fullName}</div>
              <div className="text-xs text-slate-400">
                {items === null ? 'Loading...' : `${items.length} kudos received`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm flex-shrink-0">
            Close ✕
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {items === null ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No kudos received yet.</p>
          ) : (
            items.map((r) => (
              <RecognitionCard key={r.id} token={token} recognition={r} isStaff={isStaff} myEmployeeId={myEmployeeId} onChanged={load} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RecognitionTab({ token, isStaff, employees }: { token: string; isStaff: boolean; employees: Employee[] }) {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id || null;
  const [feed, setFeed] = useState<Recognition[]>([]);
  const [leaderboard, setLeaderboard] = useState<RecognitionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RecognitionCategory | 'ALL'>('ALL');
  const [showGiveKudos, setShowGiveKudos] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<RecognitionEmployeeRef | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [f, l] = await Promise.all([
        getRecognitions(token, categoryFilter === 'ALL' ? undefined : { category: categoryFilter }),
        getRecognitionLeaderboard(token, 30),
      ]);
      setFeed(f);
      setLeaderboard(l);
    } catch (err: any) {
      setError(err?.message || 'Failed to load recognitions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, categoryFilter]);

  return (
    <div className="space-y-6">
      <RecognitionLeaderboard entries={leaderboard} onSelect={setSelectedEmployee} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              categoryFilter === 'ALL' ? toggle3dActive(HUE_GRADIENTS.slate) : TOGGLE_3D_INACTIVE
            }`}
          >
            All categories
          </button>
          {RECOGNITION_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                categoryFilter === c ? toggle3dActive(CATEGORY_GRADIENT[c]) : TOGGLE_3D_INACTIVE
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowGiveKudos(true)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 flex-shrink-0 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + Give Kudos
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : feed.length === 0 ? (
        <p className="text-sm text-slate-500">No kudos posted yet — be the first to recognize a colleague.</p>
      ) : (
        <div className="space-y-3">
          {feed.map((r) => (
            <RecognitionCard key={r.id} token={token} recognition={r} isStaff={isStaff} myEmployeeId={myEmployeeId} onChanged={load} />
          ))}
        </div>
      )}

      {showGiveKudos && (
        <GiveKudosModal
          token={token}
          employees={employees}
          myEmployeeId={myEmployeeId}
          onClose={() => setShowGiveKudos(false)}
          onCreated={load}
        />
      )}

      {selectedEmployee && (
        <EmployeeKudosDrawer
          token={token}
          employee={selectedEmployee}
          isStaff={isStaff}
          myEmployeeId={myEmployeeId}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// PULSE SURVEYS TAB
// ============================================================================

function NewPulseSurveyModal({
  token,
  departments,
  onClose,
  onCreated,
}: {
  token: string;
  departments: LookupItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audienceType, setAudienceType] = useState<PulseSurveyAudienceType>('ALL');
  const [audienceDepartmentIds, setAudienceDepartmentIds] = useState<string[]>([]);
  const [closesAt, setClosesAt] = useState('');
  const [questions, setQuestions] = useState<PulseQuestionInput[]>([{ text: '', type: 'RATING' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addQuestion() {
    setQuestions((qs) => [...qs, { text: '', type: 'RATING' }]);
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }
  function updateQuestion(i: number, patch: Partial<PulseQuestionInput>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanQuestions = questions.filter((q) => q.text.trim().length > 0);
    if (cleanQuestions.length === 0) return setError('Add at least one question');
    if (audienceType === 'DEPARTMENTS' && audienceDepartmentIds.length === 0) {
      return setError('Select at least one department');
    }
    setSaving(true);
    setError('');
    try {
      await createPulseSurvey(token, {
        title,
        description: description || undefined,
        audienceType,
        audienceDepartmentIds: audienceType === 'DEPARTMENTS' ? audienceDepartmentIds : undefined,
        closesAt: closesAt || undefined,
        questions: cleanQuestions,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create survey');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">New Pulse Survey</h2>
          <button onClick={onClose}>
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="e.g. September Team Pulse Check"
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
              <label className="block text-xs text-slate-500 mb-1">Audience</label>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value as PulseSurveyAudienceType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="ALL">Everyone</option>
                <option value="DEPARTMENTS">Specific departments</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Closes On (optional)</label>
              <input
                type="date"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          {audienceType === 'DEPARTMENTS' && (
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={audienceDepartmentIds.includes(d.id)}
                    onChange={(e) =>
                      setAudienceDepartmentIds((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)))
                    }
                  />
                  {d.name}
                </label>
              ))}
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Questions</label>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value })}
                    placeholder={`Question ${i + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(i, { type: e.target.value as PulseQuestionType })}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs w-32 flex-shrink-0"
                  >
                    {PULSE_QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(i)} className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addQuestion} className="mt-2 text-xs text-mitra-accentFrom hover:underline">
              + Add Question
            </button>
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
              {saving ? 'Creating...' : 'Create Survey (Draft)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RespondSurveyModal({
  token,
  surveyId,
  onClose,
  onSubmitted,
}: {
  token: string;
  surveyId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [survey, setSurvey] = useState<PulseSurveyDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, PulseAnswerInput>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPulseSurvey(token, surveyId).then((data) => {
      setSurvey(data);
      const initial: Record<string, PulseAnswerInput> = {};
      (data.myAnswers || []).forEach((a) => {
        initial[a.questionId] = {
          questionId: a.questionId,
          ratingValue: a.ratingValue ?? undefined,
          boolValue: a.boolValue ?? undefined,
          textValue: a.textValue ?? undefined,
        };
      });
      setAnswers(initial);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, token]);

  function setAnswer(questionId: string, patch: Partial<PulseAnswerInput>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch, questionId } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!survey) return;
    const payload = survey.questions.map((q) => answers[q.id]).filter(Boolean);
    if (payload.length === 0) return setError('Answer at least one question');
    setSaving(true);
    setError('');
    try {
      await submitPulseSurveyResponse(token, surveyId, payload);
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit response');
    } finally {
      setSaving(false);
    }
  }

  if (!survey) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-800">{survey.title}</h2>
          <button onClick={onClose}>
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {survey.description && <p className="text-sm text-slate-500 mb-4">{survey.description}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {survey.questions.map((q) => {
            const a = answers[q.id];
            return (
              <div key={q.id}>
                <label className="block text-sm text-slate-700 mb-1.5">{q.text}</label>
                {q.type === 'RATING' && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAnswer(q.id, { ratingValue: n })}
                        className={`w-8 h-8 rounded-lg border text-sm font-medium ${
                          a?.ratingValue === n
                            ? 'bg-mitra-accentFrom text-white border-mitra-accentFrom'
                            : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'YES_NO' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, { boolValue: true })}
                      className={`px-4 py-1.5 rounded-lg text-sm border ${
                        a?.boolValue === true
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(q.id, { boolValue: false })}
                      className={`px-4 py-1.5 rounded-lg text-sm border ${
                        a?.boolValue === false
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}
                {q.type === 'TEXT' && (
                  <textarea
                    value={a?.textValue || ''}
                    onChange={(e) => setAnswer(q.id, { textValue: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm text-slate-500 px-3 py-1.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Submitting...' : survey.respondedByMe ? 'Update Response' : 'Submit Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultsDrawer({ token, surveyId, onClose }: { token: string; surveyId: string; onClose: () => void }) {
  const [results, setResults] = useState<PulseSurveyResults | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPulseSurveyResults(token, surveyId)
      .then(setResults)
      .catch((err: any) => setError(err.message || 'Results are not available yet.'));
  }, [surveyId, token]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full shadow-xl overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="font-semibold text-slate-800">{results?.title || 'Results'}</div>
            {results && <div className="text-xs text-slate-400 mt-0.5">{SURVEY_STATUS_LABELS[results.status]}</div>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            Close ✕
          </button>
        </div>
        <div className="px-6 py-5 space-y-6">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {results && (
            <>
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Response Rate</span>
                  <span>
                    {results.responseCount}/{results.eligibleCount} ({results.responseRatePercent}%)
                  </span>
                </div>
                <ProgressBar pct={results.responseRatePercent} />
              </div>
              {results.questions.map((q) => (
                <div key={q.questionId} className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">{q.text}</h3>
                  {q.type === 'RATING' && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">
                        Average: <span className="font-semibold text-slate-700">{q.average ?? '—'}/5</span> ({q.responseCount} responses)
                      </div>
                      <div className="space-y-1">
                        {(q.distribution || []).map((count, idx) => {
                          const pct = q.responseCount > 0 ? Math.round((count / q.responseCount) * 100) : 0;
                          return (
                            <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="w-3">{idx + 1}</span>
                              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-mitra-accentFrom" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-8 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {q.type === 'YES_NO' && (
                    <div className="space-y-1.5">
                      {(() => {
                        const total = (q.yes || 0) + (q.no || 0);
                        const yesPct = total > 0 ? Math.round(((q.yes || 0) / total) * 100) : 0;
                        return (
                          <>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="w-8">Yes</span>
                              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
                              </div>
                              <span className="w-16 text-right">
                                {q.yes || 0} ({yesPct}%)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="w-8">No</span>
                              <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-rose-500" style={{ width: `${100 - yesPct}%` }} />
                              </div>
                              <span className="w-16 text-right">
                                {q.no || 0} ({100 - yesPct}%)
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {q.type === 'TEXT' && (
                    <div className="space-y-1.5">
                      {(q.responses || []).length === 0 ? (
                        <p className="text-sm text-slate-400">No responses yet.</p>
                      ) : (
                        (q.responses || []).map((r, idx) => (
                          <p key={idx} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            "{r}"
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Small inline SVG sparkline for the eNPS trend — thin 2px line, rounded
// ends, single hue (matches the current sentiment color), no axes/gridlines
// since this is a glanceable trend indicator, not a full chart.
function TrendSparkline({ trend, colorClass }: { trend: { label: string; score: number }[]; colorClass: string }) {
  if (trend.length < 2) return null;
  const width = 220;
  const height = 48;
  const scores = trend.map((t) => t.score);
  const min = Math.min(...scores, -20);
  const max = Math.max(...scores, 20);
  const range = max - min || 1;
  const points = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * width;
    const y = height - ((t.score - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <div>
      <svg width={width} height={height} className={colorClass} role="img" aria-label="eNPS trend over recent months">
        <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {trend.map((t, i) => {
          const x = (i / (trend.length - 1)) * width;
          const y = height - ((t.score - min) / range) * height;
          return <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5" style={{ width }}>
        <span>{trend[0].label}</span>
        <span>{trend[trend.length - 1].label}</span>
      </div>
    </div>
  );
}

function EnpsInsights({ token }: { token: string }) {
  const [insights, setInsights] = useState<PulseSurveyInsights | null>(null);

  useEffect(() => {
    getPulseSurveyInsights(token).then(setInsights).catch(() => {});
  }, [token]);

  if (!insights || insights.totalRatingResponses === 0) return null;

  const colors = enpsColor(insights.sentimentLabel);
  const grouped: Record<PulseFeedbackSentiment, typeof insights.feedback> = {
    POSITIVE: insights.feedback.filter((f) => f.sentiment === 'POSITIVE'),
    NEUTRAL: insights.feedback.filter((f) => f.sentiment === 'NEUTRAL'),
    NEEDS_ATTENTION: insights.feedback.filter((f) => f.sentiment === 'NEEDS_ATTENTION'),
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`rounded-xl px-4 py-3 ${colors.bg} ring-1 ${colors.ring}`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">eNPS Score</div>
            <div className={`text-3xl font-bold ${colors.text}`}>
              {insights.enpsScore > 0 ? '+' : ''}
              {insights.enpsScore}
            </div>
            <div className={`text-xs font-medium ${colors.text}`}>{insights.sentimentLabel}</div>
          </div>
          <div className="hidden sm:block">
            <TrendSparkline trend={insights.trend} colorClass={colors.text} />
          </div>
        </div>
        <div className="flex-1 min-w-[200px] max-w-xs">
          <div className="text-[11px] text-slate-500 mb-1">
            {insights.promoterPercent}% Promoters · {insights.passivePercent}% Passive · {insights.detractorPercent}% Detractors
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5 bg-slate-100">
            {insights.promoterPercent > 0 && <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${insights.promoterPercent}%` }} />}
            {insights.passivePercent > 0 && <div className="h-full bg-slate-300 rounded-full" style={{ width: `${insights.passivePercent}%` }} />}
            {insights.detractorPercent > 0 && <div className="h-full bg-rose-500 rounded-full" style={{ width: `${insights.detractorPercent}%` }} />}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Based on {insights.totalRatingResponses} rating responses across all pulse surveys.</div>
        </div>
      </div>

      {insights.feedback.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-600 mb-2">Anonymized Feedback</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['POSITIVE', 'NEUTRAL', 'NEEDS_ATTENTION'] as PulseFeedbackSentiment[]).map((sentiment) => (
              <div key={sentiment}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${SENTIMENT_DOT[sentiment]}`} />
                  <span className="text-[11px] font-semibold text-slate-600">
                    {SENTIMENT_LABELS[sentiment]} ({grouped[sentiment].length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {grouped[sentiment].length === 0 ? (
                    <p className="text-[11px] text-slate-400">No comments yet.</p>
                  ) : (
                    grouped[sentiment].slice(0, 3).map((f, i) => (
                      <p key={i} className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        "{f.text}"
                      </p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PulseSurveyCard({
  token,
  survey,
  isStaff,
  onChanged,
  onRespond,
  onViewResults,
}: {
  token: string;
  survey: PulseSurvey;
  isStaff: boolean;
  onChanged: () => void;
  onRespond: (id: string) => void;
  onViewResults: (id: string) => void;
}) {
  async function handleLaunch() {
    await updatePulseSurvey(token, survey.id, { status: 'ACTIVE' });
    onChanged();
  }
  async function handleClose() {
    if (!window.confirm(`Close "${survey.title}"? Employees will no longer be able to respond.`)) return;
    await updatePulseSurvey(token, survey.id, { status: 'CLOSED' });
    onChanged();
  }
  async function handleDelete() {
    if (!window.confirm(`Delete "${survey.title}"? This also deletes all responses.`)) return;
    await deletePulseSurvey(token, survey.id);
    onChanged();
  }

  const canViewResults = isStaff || survey.status === 'CLOSED';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SURVEY_STATUS_BADGE[survey.status]}`}>
              {SURVEY_STATUS_LABELS[survey.status]}
            </span>
            {survey.closesAt && <span className="text-[11px] text-slate-400">Closes {formatDate(survey.closesAt)}</span>}
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mt-1">{survey.title}</h3>
          {survey.description && <p className="text-xs text-slate-500 mt-0.5">{survey.description}</p>}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        {survey.questions.length} question{survey.questions.length === 1 ? '' : 's'} · {survey.responseCount} response
        {survey.responseCount === 1 ? '' : 's'}
      </p>
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Completion</span>
          <span>
            {survey.responseCount}/{survey.eligibleCount} (
            {survey.eligibleCount > 0 ? Math.round((survey.responseCount / survey.eligibleCount) * 100) : 0}%)
          </span>
        </div>
        <ProgressBar pct={survey.eligibleCount > 0 ? Math.round((survey.responseCount / survey.eligibleCount) * 100) : 0} />
      </div>
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 flex-wrap">
        {survey.status === 'ACTIVE' && (
          <button
            onClick={() => onRespond(survey.id)}
            className="text-xs font-medium text-white bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo rounded-lg px-3 py-1.5 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            {survey.respondedByMe ? 'Update Response' : 'Take Survey'}
          </button>
        )}
        {canViewResults && (
          <button onClick={() => onViewResults(survey.id)} className="text-xs text-slate-500 hover:text-slate-700">
            View Results
          </button>
        )}
        {isStaff && survey.status === 'DRAFT' && (
          <button onClick={handleLaunch} className="text-xs font-medium text-emerald-600 hover:underline">
            Launch Survey
          </button>
        )}
        {isStaff && survey.status === 'ACTIVE' && (
          <button onClick={handleClose} className="text-xs text-slate-500 hover:text-slate-700">
            Close Survey
          </button>
        )}
        {isStaff && (
          <button onClick={handleDelete} className="text-xs text-red-500 hover:underline ml-auto">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function PulseSurveysTab({ token, isStaff, departments }: { token: string; isStaff: boolean; departments: LookupItem[] }) {
  const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewSurvey, setShowNewSurvey] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [resultsId, setResultsId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setSurveys(await getPulseSurveys(token));
    } catch (err: any) {
      setError(err?.message || 'Failed to load pulse surveys.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="space-y-4">
      <EnpsInsights token={token} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          {isStaff
            ? 'Launch a short pulse check, then review aggregate results once it closes.'
            : 'Answer a few quick questions — responses are aggregated, never shown per-person.'}
        </p>
        {isStaff && (
          <button
            onClick={() => setShowNewSurvey(true)}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-xs font-medium px-3 py-1.5 flex-shrink-0 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            + New Survey
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : surveys.length === 0 ? (
        <p className="text-sm text-slate-500">
          {isStaff ? 'No pulse surveys yet — create one to check in with the team.' : 'No pulse surveys right now.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map((s) => (
            <PulseSurveyCard
              key={s.id}
              token={token}
              survey={s}
              isStaff={isStaff}
              onChanged={load}
              onRespond={setRespondingId}
              onViewResults={setResultsId}
            />
          ))}
        </div>
      )}

      {showNewSurvey && (
        <NewPulseSurveyModal token={token} departments={departments} onClose={() => setShowNewSurvey(false)} onCreated={load} />
      )}
      {respondingId && (
        <RespondSurveyModal
          token={token}
          surveyId={respondingId}
          onClose={() => setRespondingId(null)}
          onSubmitted={load}
        />
      )}
      {resultsId && <ResultsDrawer token={token} surveyId={resultsId} onClose={() => setResultsId(null)} />}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Engagement() {
  const { token, isStaff } = useAuth();
  const [tab, setTab] = useState<'recognition' | 'surveys'>('recognition');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);

  useEffect(() => {
    if (!token) return;
    getEmployees(token).then(setEmployees).catch(() => {});
    getDepartments(token).then(setDepartments).catch(() => {});
  }, [token]);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Engagement & Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">Peer recognition and pulse surveys — keeping a finger on team morale year-round.</p>
      </div>

      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        <button
          onClick={() => setTab('recognition')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
            tab === 'recognition' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HeartIcon className="w-3.5 h-3.5" /> Recognition Wall
        </button>
        <button
          onClick={() => setTab('surveys')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
            tab === 'surveys' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardListIcon className="w-3.5 h-3.5" /> Pulse Surveys
        </button>
      </div>

      {tab === 'recognition' ? (
        <RecognitionTab token={token} isStaff={isStaff} employees={employees} />
      ) : (
        <PulseSurveysTab token={token} isStaff={isStaff} departments={departments} />
      )}
    </div>
  );
}
