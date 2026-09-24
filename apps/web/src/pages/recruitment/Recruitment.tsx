import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CandidateDrawer from './CandidateDrawer';
import {
  getJobOpenings,
  getCandidates,
  createJobOpening,
  updateJobOpening,
  deleteJobOpening,
  createCandidate,
  updateCandidate,
  openCandidateResume,
  getCandidateSources,
  getDepartments,
  getEmployees,
  getProjects,
  getTechnologies,
} from '../../lib/api';
import {
  JobOpening,
  JobOpeningStatus,
  JobOpeningEmploymentType,
  ExperienceLevel,
  Candidate,
  CandidateStage,
  JOB_OPENING_STATUSES,
  JOB_OPENING_EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  CANDIDATE_FORWARD_STAGES,
  LookupItem,
  Employee,
  Project,
  Technology,
} from '../../types';
import {
  BriefcaseIcon,
  UsersIcon,
  ClockIcon,
  TrophyIcon,
  StarIcon,
  GripVerticalIcon,
  MoreVerticalIcon,
} from '../../components/icons';
import MetricTile from '../../components/MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';

// FINAL_ROUND displays as "Client Round" — the underlying DB value and
// field names (finalRoundNotes/finalRoundRating) are unchanged; this is a
// display-layer relabel now that this stage doubles as the client-facing
// interview for US client roles.
export const STAGE_LABELS: Record<CandidateStage, string> = {
  APPLIED: 'Applied',
  SCREENING_CALL: 'Screening',
  TECHNICAL_ROUND: 'Technical Round',
  FINAL_ROUND: 'Client Round',
  OFFER_EXTENDED: 'Offer Extended',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

const STAGE_BADGE_CLASSES: Record<CandidateStage, string> = {
  APPLIED: 'bg-slate-100 text-slate-600',
  SCREENING_CALL: 'bg-sky-100 text-sky-700',
  TECHNICAL_ROUND: 'bg-indigo-100 text-indigo-700',
  FINAL_ROUND: 'bg-fuchsia-100 text-fuchsia-700',
  OFFER_EXTENDED: 'bg-amber-100 text-amber-700',
  HIRED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const OPENING_STATUS_LABELS: Record<JobOpeningStatus, string> = {
  OPEN: 'Open',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
};

const OPENING_STATUS_BADGE: Record<JobOpeningStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-slate-200 text-slate-600',
};

const EMPLOYMENT_TYPE_LABELS: Record<JobOpeningEmploymentType, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
};

const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ENTRY: 'Entry-level',
  MID: 'Mid-level',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

// The 6 forward-moving Kanban columns — REJECTED is intentionally excluded
// (it can happen from any stage, so it isn't a column of its own); rejected
// candidates remain visible via Table View.
const KANBAN_COLUMNS: CandidateStage[] = CANDIDATE_FORWARD_STAGES;

// 3D gradient KPI cards, matching the tactile design introduced on Bench
// & Utilization — shared across the app via lib/tileThemes.
const KPI_CARD_THEME: Record<'indigo' | 'sky' | 'fuchsia' | 'emerald', (typeof TILE_THEMES)[number]> = {
  indigo: TILE_THEMES[0],
  sky: TILE_THEMES[2],
  fuchsia: TILE_THEMES[5],
  emerald: TILE_THEMES[3],
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function candidateRatingAvg(c: Candidate): number | null {
  const ratings = [c.screeningRating, c.technicalRating, c.finalRoundRating].filter(
    (r): r is number => typeof r === 'number',
  );
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: keyof typeof KPI_CARD_THEME;
  icon: (props: { className?: string }) => JSX.Element;
}) {
  return (
    <div className={tileWrapperClass(KPI_CARD_THEME[color])}>
      <MetricTile icon={icon} label={label} value={value} />
    </div>
  );
}

function OpeningCard({
  opening,
  hiredCount,
  selected,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  opening: JobOpening;
  hiredCount: number;
  selected: boolean;
  onSelect: () => void;
  onStatusChange: (status: JobOpeningStatus) => void;
  onDelete: () => void;
}) {
  const activeCandidates = opening._count?.candidates || 0;
  const clientLabel = opening.project?.client?.name || opening.department?.name || 'Unassigned';

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      className={`flex-shrink-0 w-72 bg-white border-2 rounded-xl p-4 cursor-pointer transition-colors ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {selected && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Filtering pipeline below
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-800 text-sm">{opening.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">Ref: {opening.refCode}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-slate-300 hover:text-red-500 text-xs"
        >
          ✕
        </button>
      </div>

      <div className="mt-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
          {clientLabel}
        </span>
      </div>

      {opening.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {opening.technologies.slice(0, 4).map((t) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {t.name}
            </span>
          ))}
          {opening.technologies.length > 4 && (
            <span className="text-[10px] text-slate-400">+{opening.technologies.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <select
          value={opening.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value as JobOpeningStatus)}
          className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${OPENING_STATUS_BADGE[opening.status]}`}
        >
          {JOB_OPENING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {OPENING_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="text-right">
          <div className="text-xs font-medium text-slate-600">
            {hiredCount}/{opening.headcountTarget} Filled
          </div>
          <div className="text-[10px] text-slate-400">
            {activeCandidates} active candidate{activeCandidates === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewOpeningModal({
  departments,
  projects,
  employees,
  technologies,
  onClose,
  onCreated,
}: {
  departments: LookupItem[];
  projects: Project[];
  employees: Employee[];
  technologies: Technology[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hiringManagerId, setHiringManagerId] = useState('');
  const [technologyIds, setTechnologyIds] = useState<string[]>([]);
  const [employmentType, setEmploymentType] = useState<JobOpeningEmploymentType>('FULL_TIME');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('MID');
  const [salaryRange, setSalaryRange] = useState('');
  const [headcountTarget, setHeadcountTarget] = useState(1);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');

  function toggleTech(id: string) {
    setTechnologyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await createJobOpening(token, {
        title,
        departmentId: departmentId || undefined,
        projectId: projectId || undefined,
        hiringManagerId: hiringManagerId || undefined,
        technologyIds: technologyIds.length > 0 ? technologyIds : undefined,
        employmentType,
        experienceLevel,
        salaryRange: salaryRange || undefined,
        headcountTarget,
        description: description || undefined,
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">New Job Opening</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Job Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="e.g. Senior DevOps Engineer"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Linked Client / Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">Not tied to a specific project</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client?.name} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Target Hiring Manager</label>
              <select
                value={hiringManagerId}
                onChange={(e) => setHiringManagerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                    {e.designation?.name ? ` — ${e.designation.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Required Skills / Tech Stack</label>
            {technologies.length === 0 ? (
              <p className="text-xs text-slate-400">No technologies configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {technologies.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTech(t.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      technologyIds.includes(t.id)
                        ? 'bg-mitra-accentFrom text-white border-mitra-accentFrom'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as JobOpeningEmploymentType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {JOB_OPENING_EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {EXPERIENCE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {EXPERIENCE_LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Salary / Budget Range</label>
              <input
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                placeholder="e.g. $90k–$120k"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Headcount Target</label>
              <input
                type="number"
                min={1}
                value={headcountTarget}
                onChange={(e) => setHeadcountTarget(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              placeholder="Optional — role summary, requirements, etc."
            />
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
              {saving ? 'Creating...' : 'Create Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCandidateModal({
  openings,
  defaultOpeningId,
  onClose,
  onCreated,
}: {
  openings: JobOpening[];
  defaultOpeningId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { token } = useAuth();
  const [jobOpeningId, setJobOpeningId] = useState(defaultOpeningId || openings[0]?.id || '');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [candidateSources, setCandidateSources] = useState<LookupItem[]>([]);

  useEffect(() => {
    if (!token) return;
    getCandidateSources(token).then(setCandidateSources).catch(() => {});
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !jobOpeningId) return;
    setSaving(true);
    setError('');
    try {
      await createCandidate(
        token,
        { jobOpeningId, fullName, email, phone: phone || undefined, source },
        resume || undefined,
      );
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
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Candidate</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Job Opening</label>
            <select
              required
              value={jobOpeningId}
              onChange={(e) => setJobOpeningId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {openings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Full Name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Source</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                list="candidate-sources-datalist"
                placeholder="e.g. LinkedIn, Referral, Agency"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <datalist id="candidate-sources-datalist">
                {candidateSources.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Resume (optional)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
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
              {saving ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CandidateQuickMenu({
  candidate,
  onOpen,
  onViewResume,
  onSchedule,
  onMoveStage,
  onReject,
}: {
  candidate: Candidate;
  onOpen: () => void;
  onViewResume: () => void;
  onSchedule: (iso: string) => void;
  onMoveStage: (stage: CandidateStage) => void;
  onReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');

  function closeMenu() {
    setOpen(false);
    setScheduling(false);
    setScheduleValue('');
  }

  const currentIndex = CANDIDATE_FORWARD_STAGES.indexOf(candidate.stage);
  const forwardOptions = currentIndex >= 0 ? CANDIDATE_FORWARD_STAGES.slice(currentIndex + 1) : [];

  return (
    <div className="relative flex-shrink-0" draggable={false} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Quick actions"
      >
        <MoreVerticalIcon className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeMenu} />
          <div className="absolute right-0 top-6 z-20 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs">
            <button
              onClick={() => {
                closeMenu();
                onOpen();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600"
            >
              View Details
            </button>
            {candidate.resumeUrl && (
              <button
                onClick={() => {
                  closeMenu();
                  onViewResume();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600"
              >
                View Resume
              </button>
            )}
            {!scheduling ? (
              <button
                onClick={() => setScheduling(true)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600"
              >
                Schedule Interview
              </button>
            ) : (
              <div className="px-3 py-1.5 space-y-1.5">
                <input
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  className="w-full rounded border border-slate-300 px-1.5 py-1 text-[11px]"
                />
                <button
                  disabled={!scheduleValue}
                  onClick={() => {
                    onSchedule(new Date(scheduleValue).toISOString());
                    closeMenu();
                  }}
                  className="w-full rounded bg-mitra-accentFrom text-white text-[11px] py-1 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}
            {candidate.stage !== 'HIRED' && candidate.stage !== 'REJECTED' && forwardOptions.length > 0 && (
              <div className="border-t border-slate-100 mt-1 pt-1">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">Move to stage</div>
                {forwardOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onMoveStage(s);
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600"
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
            {candidate.stage !== 'REJECTED' && (
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    closeMenu();
                    onReject();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-500"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CandidateKanbanCard({
  candidate,
  onOpen,
  onDragStart,
  onViewResume,
  onSchedule,
  onMoveStage,
  onReject,
}: {
  candidate: Candidate;
  onOpen: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onViewResume: () => void;
  onSchedule: (iso: string) => void;
  onMoveStage: (stage: CandidateStage) => void;
  onReject: () => void;
}) {
  const rating = candidateRatingAvg(candidate);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className="group relative bg-white border border-slate-200 rounded-lg p-3 pl-6 cursor-grab active:cursor-grabbing hover:border-mitra-accentFrom/40 hover:shadow-sm transition-colors"
    >
      <GripVerticalIcon className="absolute left-0.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />

      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="font-medium text-slate-700 text-sm truncate">{candidate.fullName}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{candidate.jobOpening?.title}</div>
        </div>
        <CandidateQuickMenu
          candidate={candidate}
          onOpen={onOpen}
          onViewResume={onViewResume}
          onSchedule={onSchedule}
          onMoveStage={onMoveStage}
          onReject={onReject}
        />
      </div>

      <div className="flex items-center justify-between mt-2 gap-1">
        <span className="text-[10px] text-slate-400">
          {formatDate(candidate.appliedAt)} · {candidate.source || 'Other'}
        </span>
        {rating !== null && (
          <span className="flex items-center gap-0.5 text-amber-500 flex-shrink-0">
            <StarIcon filled className="w-3 h-3" />
            <span className="text-[10px] font-medium">{rating.toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanBoard({
  candidates,
  onOpen,
  onDropStage,
  onViewResume,
  onSchedule,
  onReject,
}: {
  candidates: Candidate[];
  onOpen: (id: string) => void;
  onDropStage: (id: string, stage: CandidateStage) => void;
  onViewResume: (candidate: Candidate) => void;
  onSchedule: (candidate: Candidate, iso: string) => void;
  onReject: (candidate: Candidate) => void;
}) {
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null);

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, stage: CandidateStage) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onDropStage(id, stage);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {KANBAN_COLUMNS.map((stage) => {
        const items = candidates.filter((c) => c.stage === stage);
        const isOver = dragOverStage === stage;
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
            onDrop={(e) => handleDrop(e, stage)}
            className={`rounded-xl border p-2.5 min-h-[220px] transition-colors ${
              isOver ? 'bg-mitra-accentFrom/5 border-mitra-accentFrom/40' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-slate-600">{STAGE_LABELS[stage]}</h3>
              <span className="text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-1.5 py-0.5">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((c) => (
                <CandidateKanbanCard
                  key={c.id}
                  candidate={c}
                  onOpen={() => onOpen(c.id)}
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onViewResume={() => onViewResume(c)}
                  onSchedule={(iso) => onSchedule(c, iso)}
                  onMoveStage={(stage) => onDropStage(c.id, stage)}
                  onReject={() => onReject(c)}
                />
              ))}
              {items.length === 0 && <div className="text-[10px] text-slate-300 text-center py-6">No candidates</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Recruitment() {
  const { token } = useAuth();
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [openingFilter, setOpeningFilter] = useState('');
  const [stageFilter, setStageFilter] = useState<CandidateStage | 'ALL'>('ALL');
  const [showNewOpening, setShowNewOpening] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    try {
      const [op, cand, deps, emps, projs, techs] = await Promise.all([
        getJobOpenings(token),
        getCandidates(token),
        getDepartments(token),
        getEmployees(token),
        getProjects(token),
        getTechnologies(token),
      ]);
      setOpenings(op);
      setCandidates(cand);
      setDepartments(deps);
      setEmployees(emps);
      setProjects(projs);
      setTechnologies(techs);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load recruitment data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleOpeningStatusChange(opening: JobOpening, status: JobOpeningStatus) {
    if (!token) return;
    await updateJobOpening(token, opening.id, { status });
    load();
  }

  async function handleDeleteOpening(opening: JobOpening) {
    if (!token) return;
    const count = opening._count?.candidates || 0;
    const warning =
      count > 0
        ? `Delete "${opening.title}"? This also permanently deletes its ${count} candidate${
            count === 1 ? '' : 's'
          } and their resumes.`
        : `Delete "${opening.title}"?`;
    if (!confirm(warning)) return;
    await deleteJobOpening(token, opening.id);
    load();
  }

  async function handleCandidateStageChange(id: string, stage: CandidateStage) {
    if (!token) return;
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate || candidate.stage === stage) return;
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    try {
      await updateCandidate(token, id, { stage });
      load();
    } catch (err) {
      load();
    }
  }

  function handleViewResume(candidate: Candidate) {
    if (!token) return;
    openCandidateResume(token, candidate.id);
  }

  async function handleQuickSchedule(candidate: Candidate, iso: string) {
    if (!token) return;
    await updateCandidate(token, candidate.id, { nextInterviewAt: iso });
    load();
  }

  async function handleQuickReject(candidate: Candidate) {
    if (!token) return;
    const reason = prompt(`Reason for rejecting ${candidate.fullName}? (optional)`) ?? undefined;
    await updateCandidate(token, candidate.id, { stage: 'REJECTED', rejectionReason: reason || undefined });
    load();
  }

  const now = new Date();
  const kpis = useMemo(() => {
    const openPositions = openings.filter((o) => o.status === 'OPEN').length;
    const activeCandidates = candidates.filter((c) => c.stage !== 'HIRED' && c.stage !== 'REJECTED').length;
    const inFinalStage = candidates.filter((c) => c.stage === 'FINAL_ROUND' || c.stage === 'OFFER_EXTENDED').length;
    const hiredThisMonth = candidates.filter(
      (c) =>
        c.stage === 'HIRED' &&
        c.hiredAt &&
        new Date(c.hiredAt).getMonth() === now.getMonth() &&
        new Date(c.hiredAt).getFullYear() === now.getFullYear(),
    ).length;
    return { openPositions, activeCandidates, inFinalStage, hiredThisMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openings, candidates]);

  const kanbanFiltered = candidates.filter((c) => {
    if (openingFilter && c.jobOpeningId !== openingFilter) return false;
    if (search && !c.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tableFiltered = candidates.filter((c) => {
    if (openingFilter && c.jobOpeningId !== openingFilter) return false;
    if (stageFilter !== 'ALL' && c.stage !== stageFilter) return false;
    if (search && !c.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedOpeningTitle = openings.find((o) => o.id === openingFilter)?.title;

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track open positions and candidates from application through offer — mirrors the team's actual hiring
            process.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewOpening(true)}
            className="rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50"
          >
            + New Opening
          </button>
          <button
            onClick={() => setShowAddCandidate(true)}
            disabled={openings.length === 0}
            title={openings.length === 0 ? 'Create a job opening first' : undefined}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            + Add Candidate
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Couldn't load recruitment data: {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Open Positions" value={kpis.openPositions} color="indigo" icon={BriefcaseIcon} />
        <KpiCard label="Active Candidates" value={kpis.activeCandidates} color="sky" icon={UsersIcon} />
        <KpiCard label="In Client Round / Offer" value={kpis.inFinalStage} color="fuchsia" icon={ClockIcon} />
        <KpiCard label="Hired This Month" value={kpis.hiredThisMonth} color="emerald" icon={TrophyIcon} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Active Job Requisitions</h2>
        {openings.length === 0 ? (
          <p className="text-sm text-slate-500">No job openings yet — create one to start adding candidates.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {openings.map((o) => {
              const hiredCount = candidates.filter((c) => c.jobOpeningId === o.id && c.stage === 'HIRED').length;
              return (
                <OpeningCard
                  key={o.id}
                  opening={o}
                  hiredCount={hiredCount}
                  selected={openingFilter === o.id}
                  onSelect={() => setOpeningFilter((prev) => (prev === o.id ? '' : o.id))}
                  onStatusChange={(status) => handleOpeningStatusChange(o, status)}
                  onDelete={() => handleDeleteOpening(o)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Candidate Pipeline</h2>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          <button
            onClick={() => setView('kanban')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              view === 'kanban' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Kanban Board View
          </button>
          <button
            onClick={() => setView('table')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              view === 'table' ? 'bg-mitra-accentFrom text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-56"
          />
          <select
            value={openingFilter}
            onChange={(e) => setOpeningFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          >
            <option value="">All openings</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          {view === 'table' && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as CandidateStage | 'ALL')}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="ALL">All stages</option>
              {(Object.keys(STAGE_LABELS) as CandidateStage[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          )}
          {openingFilter && (
            <button
              onClick={() => setOpeningFilter('')}
              className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1"
            >
              Filtered by: {selectedOpeningTitle} ✕
            </button>
          )}
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard
          candidates={kanbanFiltered}
          onOpen={setOpenCandidateId}
          onDropStage={handleCandidateStageChange}
          onViewResume={handleViewResume}
          onSchedule={handleQuickSchedule}
          onReject={handleQuickReject}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {tableFiltered.length === 0 ? (
            <p className="text-slate-500 text-sm">No candidates match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Candidate</th>
                    <th className="pb-2 font-medium">Job Opening</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Applied</th>
                    <th className="pb-2 font-medium">Rating</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableFiltered.map((c) => {
                    const rating = candidateRatingAvg(c);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <div className="font-medium text-slate-700">{c.fullName}</div>
                          <div className="text-xs text-slate-400">{c.email}</div>
                        </td>
                        <td className="py-2.5 text-slate-500">{c.jobOpening?.title || '—'}</td>
                        <td className="py-2.5 text-slate-500">{c.source || 'Other'}</td>
                        <td className="py-2.5 text-slate-500">{formatDate(c.appliedAt)}</td>
                        <td className="py-2.5 text-slate-500">
                          {rating !== null ? (
                            <span className="flex items-center gap-0.5 text-amber-500">
                              <StarIcon filled className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">{rating.toFixed(1)}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_BADGE_CLASSES[c.stage]}`}>
                            {STAGE_LABELS[c.stage]}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setOpenCandidateId(c.id)}
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
      )}

      {showNewOpening && (
        <NewOpeningModal
          departments={departments}
          projects={projects}
          employees={employees}
          technologies={technologies}
          onClose={() => setShowNewOpening(false)}
          onCreated={load}
        />
      )}

      {showAddCandidate && (
        <AddCandidateModal
          openings={openings.filter((o) => o.status !== 'CLOSED')}
          defaultOpeningId={openingFilter || undefined}
          onClose={() => setShowAddCandidate(false)}
          onCreated={load}
        />
      )}

      {openCandidateId && (
        <CandidateDrawer
          candidateId={openCandidateId}
          departments={departments}
          onClose={() => setOpenCandidateId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
