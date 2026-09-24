import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MyLearningPanel from '../../components/MyLearningPanel';
import MyTestsPanel from '../../components/MyTestsPanel';
import TestResultsTable from '../../components/TestResultsTable';
import ManageAssessmentsPanel from '../../components/ManageAssessmentsPanel';
import LearningPortalCard from '../../components/LearningPortalCard';
import LearningReferencePanel from '../../components/LearningReferencePanel';
import Tabs3D, { Tab3DColor, Tab3DItem } from '../../components/Tabs3D';
import { AwardIcon, ExternalLinkIcon } from '../../components/icons';
import Progress3DBar from '../../components/Progress3DBar';
import { resourceLinkLabel } from '../../lib/resourceLinks';
import { CATEGORY_LABELS, CATEGORY_THEME, TRAINING_CATEGORIES } from '../../lib/trainingCategories';
import { TRACK_LABELS, TRACK_THEME, TRAINING_TRACKS, categoriesForTrack } from '../../lib/trainingTracks';
import { HUE_GRADIENTS, TOGGLE_3D_INACTIVE, toggle3dActive } from '../../lib/buttonStyles';
import {
  assignTraining,
  getEmployee,
  getEmployees,
  getLearningPortals,
  getLearningReference,
  getMyTraining,
  getTrainingCourses,
  getTrainingProgress,
  removeTrainingAssignment,
  updateTrainingAssignmentStatus,
} from '../../lib/api';
import {
  Employee,
  EmployeeTraining,
  LearningPortalCredential,
  LearningReferenceGroup,
  LearningTrack,
  TrainingCategory,
  TrainingCourse,
  TrainingProgressEntry,
  TrainingStatus,
} from '../../types';

type LearningCenterTab = LearningTrack | 'ASSESSMENTS';

const ASSESSMENTS_TAB_THEME = { active: 'bg-gradient-to-br from-violet-500 to-purple-700', glow: 'shadow-violet-500/40 ring-violet-300' };

const ASSESSMENT_SUBTRACK_COLOR: Record<LearningTrack, Tab3DColor> = {
  MANDATORY: 'indigo',
  IAM_ENGINEERING: 'emerald',
  DEVOPS_ENGINEERING: 'amber',
};

const STATUS_OPTIONS: { key: TrainingStatus; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];
const STATUS_PILL: Record<TrainingStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-500',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
};
const STATUS_PILL_ACTIVE: Record<TrainingStatus, string> = {
  NOT_STARTED: 'bg-slate-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
};

function EmployeeTrainingDetail({
  employeeId,
  categories,
  onChanged,
}: {
  employeeId: string;
  categories?: TrainingCategory[];
  onChanged?: () => void;
}) {
  const { token } = useAuth();
  const [allItems, setAllItems] = useState<EmployeeTraining[] | null>(null);
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    getMyTraining(token, employeeId)
      .then(setAllItems)
      .catch((err) => setError(err.message));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId]);

  const items = categories ? allItems?.filter((i) => categories.includes(i.course.category)) ?? null : allItems;

  async function handleChange(id: string, status: TrainingStatus) {
    if (!token) return;
    try {
      await updateTrainingAssignmentStatus(token, id, status);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUnassign(id: string, title: string) {
    if (!token) return;
    if (!confirm(`Unassign "${title}" from this employee? Their progress on it will be lost.`)) return;
    try {
      await removeTrainingAssignment(token, id);
      load();
      onChanged?.();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (error) return <div className="text-sm text-red-600 px-4 py-3">{error}</div>;
  if (!items) return <p className="text-slate-500 text-sm px-4 py-3">Loading...</p>;
  if (items.length === 0) return <p className="text-slate-500 text-sm px-4 py-3">No courses assigned yet.</p>;

  return (
    <div className="px-4 py-3 bg-slate-50">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-4 align-top">
                <div className="mb-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${CATEGORY_THEME[item.course.category].chip}`}>
                    {CATEGORY_LABELS[item.course.category]}
                  </span>
                  {item.course.title}
                </div>
                {item.course.resources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.course.resources.map((r) => (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
                      >
                        {resourceLinkLabel(r.url, r.label)}
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-2 text-right whitespace-nowrap align-top">
                <div className="flex gap-1.5 justify-end items-center">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleChange(item.id, s.key)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === s.key ? STATUS_PILL_ACTIVE[s.key] : 'bg-white border border-slate-200 text-slate-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleUnassign(item.id, item.course.title)}
                    className="text-xs text-red-500 hover:text-red-700 ml-1"
                  >
                    Unassign
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamProgressTab({ track, categories }: { track: LearningTrack; categories?: TrainingCategory[] }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<TrainingProgressEntry[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const [pickCourseId, setPickCourseId] = useState('');
  const [pickEmployeeId, setPickEmployeeId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

  const scopedCourses = categories ? courses.filter((c) => categories.includes(c.category)) : courses;

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getTrainingProgress(token, categories), getTrainingCourses(token), getEmployees(token)])
      .then(([p, c, e]) => {
        setRows(p);
        setCourses(c);
        setEmployees(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, track]);

  async function handleAssignStandard(employeeId: string) {
    if (!token) return;
    setAssigningId(employeeId);
    setError('');
    try {
      const nonRestricted = scopedCourses.filter((c) => c.active && !c.restrictedTo).map((c) => c.id);
      await assignTraining(token, { employeeIds: [employeeId], courseIds: nonRestricted });
      setExpandedId(employeeId);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  }

  async function handleUnassignAll(employeeId: string, fullName: string) {
    if (!token) return;
    if (
      !confirm(
        `Unassign ALL courses currently assigned to ${fullName}? This clears their entire curriculum and any progress on it — use this to undo a curriculum assigned to the wrong person.`,
      )
    )
      return;
    setUnassigningId(employeeId);
    setError('');
    try {
      const assignments = await getMyTraining(token, employeeId);
      await Promise.all(assignments.map((a) => removeTrainingAssignment(token, a.id)));
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnassigningId(null);
    }
  }

  async function handleAssignOne(e: FormEvent) {
    e.preventDefault();
    if (!token || !pickCourseId || !pickEmployeeId) return;
    const targetEmployeeId = pickEmployeeId;
    setAssignSubmitting(true);
    setAssignMessage('');
    try {
      await assignTraining(token, { employeeIds: [targetEmployeeId], courseIds: [pickCourseId] });
      setAssignMessage('Assigned.');
      setPickEmployeeId('');
      setExpandedId(targetEmployeeId);
      load();
    } catch (err: any) {
      setAssignMessage(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  }

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.fullName }));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Assign a Course</h2>
        <p className="text-xs text-slate-500 mb-4">
          For role-specific courses (e.g. Git Branching for DevOps engineers) or anything new. For a new hire's
          full onboarding list, use "Assign Standard Curriculum" on their row below instead.
        </p>
        {assignMessage && <div className="text-sm text-slate-600 mb-3">{assignMessage}</div>}
        <form onSubmit={handleAssignOne} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Course</label>
            <select
              required
              value={pickCourseId}
              onChange={(e) => setPickCourseId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select a course...</option>
              {scopedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {CATEGORY_LABELS[c.category]} · {c.title}
                  {c.restrictedTo ? ` (${c.restrictedTo})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={pickEmployeeId}
              onChange={(e) => setPickEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select an employee...</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={assignSubmitting}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {assignSubmitting ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500 text-sm">No active employees.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Department / Designation</th>
                  <th className="pb-2 font-medium">Progress</th>
                  <th className="pb-2 font-medium">Completed</th>
                  <th className="pb-2 font-medium">In Progress</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                      <td className="py-2 font-medium text-slate-700">{r.fullName}</td>
                      <td className="py-2 text-slate-500">{[r.designationName, r.departmentName].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-24 flex-shrink-0">
                            <Progress3DBar
                              percent={r.percentComplete}
                              fillClassName={
                                r.percentComplete === 100
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                  : 'bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo'
                              }
                            />
                          </div>
                          <span className="text-slate-600 text-xs w-8">{r.percentComplete}%</span>
                        </div>
                      </td>
                      <td className="py-2 text-slate-500">
                        {r.completed}/{r.totalAssigned}
                      </td>
                      <td className="py-2 text-slate-500">{r.inProgress}</td>
                      <td className="py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleAssignStandard(r.id)}
                            disabled={assigningId === r.id}
                            className="text-xs text-mitra-accentFrom hover:underline disabled:opacity-50"
                          >
                            {assigningId === r.id
                              ? 'Assigning...'
                              : track === 'MANDATORY'
                              ? 'Assign Standard Curriculum'
                              : 'Assign All Courses'}
                          </button>
                          {r.totalAssigned > 0 && (
                            <button
                              onClick={() => handleUnassignAll(r.id, r.fullName)}
                              disabled={unassigningId === r.id}
                              className="text-xs text-red-500 hover:underline disabled:opacity-50"
                            >
                              {unassigningId === r.id ? 'Unassigning...' : 'Unassign All'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <EmployeeTrainingDetail employeeId={r.id} categories={categories} onChanged={load} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </div>
    </div>
  );
}

function PortalAccessSection({ track }: { track: 'IAM' | 'DEVOPS' }) {
  const { token } = useAuth();
  const [portals, setPortals] = useState<LearningPortalCredential[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getLearningPortals(token, track)
      .then(setPortals)
      .catch((err) => setError(err.message));
  }, [token, track]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!portals || portals.length === 0) return null;

  const themes = [
    { bg: 'bg-gradient-to-br from-cyan-500 to-teal-700', shadow: 'shadow-[0_10px_24px_-8px_rgba(13,148,136,0.5)]' },
    { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-700', shadow: 'shadow-[0_10px_24px_-8px_rgba(79,70,229,0.5)]' },
    { bg: 'bg-gradient-to-br from-violet-500 to-purple-700', shadow: 'shadow-[0_10px_24px_-8px_rgba(147,51,234,0.5)]' },
    { bg: 'bg-gradient-to-br from-rose-500 to-red-700', shadow: 'shadow-[0_10px_24px_-8px_rgba(220,38,38,0.5)]' },
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-slate-800 mb-3">Portal Access</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {portals.map((p, i) => (
          <LearningPortalCard key={p.id} portal={p} theme={themes[i % themes.length]} />
        ))}
      </div>
    </div>
  );
}

function ReferenceSection({ track }: { track: 'IAM' | 'DEVOPS' }) {
  const { token } = useAuth();
  const [groups, setGroups] = useState<LearningReferenceGroup[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getLearningReference(token, track)
      .then(setGroups)
      .catch((err) => setError(err.message));
  }, [token, track]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!groups || groups.length === 0) return null;
  return <LearningReferencePanel groups={groups} />;
}

function IamEngineeringTab({ employeeId }: { employeeId?: string | null }) {
  const categories = categoriesForTrack('IAM_ENGINEERING', TRAINING_CATEGORIES);
  return (
    <div className="space-y-6">
      <PortalAccessSection track="IAM" />
      {employeeId && (
        <MyLearningPanel
          employeeId={employeeId}
          title="My IAM Learning"
          categories={categories}
          emptyMessage="No IAM courses assigned to you yet — ask a manager to assign one from the catalog below."
        />
      )}
      <TeamProgressTab track="IAM_ENGINEERING" categories={categories} />
      <ReferenceSection track="IAM" />
    </div>
  );
}

function DevOpsEngineeringTab({ employeeId }: { employeeId?: string | null }) {
  const categories = categoriesForTrack('DEVOPS_ENGINEERING', TRAINING_CATEGORIES);
  return (
    <div className="space-y-6">
      <PortalAccessSection track="DEVOPS" />
      {employeeId && (
        <MyLearningPanel
          employeeId={employeeId}
          title="My DevOps Learning"
          categories={categories}
          emptyMessage="No DevOps courses assigned to you yet — ask a manager to assign one from the catalog below."
        />
      )}
      <TeamProgressTab track="DEVOPS_ENGINEERING" categories={categories} />
      <ReferenceSection track="DEVOPS" />
    </div>
  );
}

// Learning Center "Assessments" tab. Groups by the same Mandatory/IAM/
// DevOps tracks as the rest of the Learning Center; shows the logged-in
// employee's own assessment(s) plus, for staff, authoring + org-wide
// results scoped to the same track. Mandatory Training is one track-wide
// assessment; IAM/DevOps stay per-course — see MyTestsPanel/ManageAssessmentsPanel.
function AssessmentsSection({ employeeId, isStaff }: { employeeId?: string | null; isStaff: boolean }) {
  const { token } = useAuth();
  const [subTrack, setSubTrack] = useState<LearningTrack>('MANDATORY');
  const [staffView, setStaffView] = useState<'results' | 'manage'>('results');
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!token || !employeeId) return;
    getEmployee(token, employeeId)
      .then(setEmployee)
      .catch(() => {});
  }, [token, employeeId]);

  const categories = categoriesForTrack(subTrack, TRAINING_CATEGORIES);
  const subTabs: Tab3DItem<LearningTrack>[] = TRAINING_TRACKS.map((t) => ({
    key: t,
    label: TRACK_LABELS[t],
    color: ASSESSMENT_SUBTRACK_COLOR[t],
  }));

  return (
    <div className="space-y-6">
      <Tabs3D tabs={subTabs} active={subTrack} onChange={setSubTrack} />

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-violet-600">
              <AwardIcon className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-slate-800">My Assessments</h2>
          </div>
          <MyTestsPanel
            track={subTrack}
            employeeId={employeeId}
            employeeName={employee?.fullName || ''}
            employeeCode={employee?.employeeCode}
            photoUrl={employee?.photoUrl}
            departmentName={employee?.department?.name}
            designationName={employee?.designation?.name}
            categories={categories}
          />
        </div>
      )}

      {isStaff && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setStaffView('results')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                staffView === 'results' ? toggle3dActive(HUE_GRADIENTS.indigo) : TOGGLE_3D_INACTIVE
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setStaffView('manage')}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg ${
                staffView === 'manage' ? toggle3dActive(HUE_GRADIENTS.indigo) : TOGGLE_3D_INACTIVE
              }`}
            >
              Manage Assessments
            </button>
          </div>
          {staffView === 'results' ? <TestResultsTable categories={categories} /> : <ManageAssessmentsPanel track={subTrack} categories={categories} />}
        </div>
      )}
    </div>
  );
}

export default function LearningCenter() {
  const { user, isStaff } = useAuth();
  const [track, setTrack] = useState<LearningCenterTab>('MANDATORY');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Learning Center</h1>

      <div className="flex flex-wrap gap-2">
        {TRAINING_TRACKS.map((t) => {
          const theme = TRACK_THEME[t];
          const active = track === t;
          return (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-150 ease-out ${
                active
                  ? `text-white ${theme.active} shadow-lg ${theme.glow} ring-2 hover:-translate-y-0.5`
                  : 'bg-white text-slate-500 border border-slate-200 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5'
              }`}
            >
              {TRACK_LABELS[t]}
            </button>
          );
        })}
        <button
          onClick={() => setTrack('ASSESSMENTS')}
          className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-150 ease-out flex items-center gap-1.5 ${
            track === 'ASSESSMENTS'
              ? `text-white ${ASSESSMENTS_TAB_THEME.active} shadow-lg ${ASSESSMENTS_TAB_THEME.glow} ring-2 hover:-translate-y-0.5`
              : 'bg-white text-slate-500 border border-slate-200 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5'
          }`}
        >
          <AwardIcon className="w-4 h-4" /> Assessments
        </button>
      </div>

      {track === 'MANDATORY' && (
        <>
          {user?.employeeId && (
            <MyLearningPanel
              employeeId={user.employeeId}
              title="My Learning"
              categories={categoriesForTrack('MANDATORY', TRAINING_CATEGORIES)}
            />
          )}
          <TeamProgressTab track="MANDATORY" categories={categoriesForTrack('MANDATORY', TRAINING_CATEGORIES)} />
        </>
      )}

      {track === 'IAM_ENGINEERING' && <IamEngineeringTab employeeId={user?.employeeId} />}

      {track === 'DEVOPS_ENGINEERING' && <DevOpsEngineeringTab employeeId={user?.employeeId} />}

      {track === 'ASSESSMENTS' && <AssessmentsSection employeeId={user?.employeeId} isStaff={isStaff} />}
    </div>
  );
}
