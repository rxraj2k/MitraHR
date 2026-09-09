import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MyLearningPanel from '../../components/MyLearningPanel';
import { CATEGORY_LABELS, CATEGORY_THEME } from '../../lib/trainingCategories';
import {
  assignTraining,
  getEmployees,
  getMyTraining,
  getTrainingCourses,
  getTrainingProgress,
  removeTrainingAssignment,
  updateTrainingAssignmentStatus,
} from '../../lib/api';
import { Employee, EmployeeTraining, TrainingCourse, TrainingProgressEntry, TrainingStatus } from '../../types';

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

function EmployeeTrainingDetail({ employeeId, onChanged }: { employeeId: string; onChanged?: () => void }) {
  const { token } = useAuth();
  const [items, setItems] = useState<EmployeeTraining[] | null>(null);
  const [error, setError] = useState('');

  function load() {
    if (!token) return;
    getMyTraining(token, employeeId)
      .then(setItems)
      .catch((err) => setError(err.message));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, employeeId]);

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
              <td className="py-2 pr-4">
                <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${CATEGORY_THEME[item.course.category].chip}`}>
                  {CATEGORY_LABELS[item.course.category]}
                </span>
                {item.course.title}
              </td>
              <td className="py-2 text-right whitespace-nowrap">
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

function TeamProgressTab() {
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

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getTrainingProgress(token), getTrainingCourses(token), getEmployees(token)])
      .then(([p, c, e]) => {
        setRows(p);
        setCourses(c);
        setEmployees(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAssignStandard(employeeId: string) {
    if (!token) return;
    setAssigningId(employeeId);
    setError('');
    try {
      const nonRestricted = courses.filter((c) => c.active && !c.restrictedTo).map((c) => c.id);
      await assignTraining(token, { employeeIds: [employeeId], courseIds: nonRestricted });
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
    setAssignSubmitting(true);
    setAssignMessage('');
    try {
      await assignTraining(token, { employeeIds: [pickEmployeeId], courseIds: [pickCourseId] });
      setAssignMessage('Assigned.');
      setPickEmployeeId('');
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
              {courses.map((c) => (
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
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
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
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                            <div
                              className={`h-full ${r.percentComplete === 100 ? 'bg-green-500' : 'bg-mitra-accentFrom'}`}
                              style={{ width: `${r.percentComplete}%` }}
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
                            {assigningId === r.id ? 'Assigning...' : 'Assign Standard Curriculum'}
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
                          <EmployeeTrainingDetail employeeId={r.id} onChanged={load} />
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

export default function LearningCenter() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Learning Center</h1>

      {user?.employeeId && <MyLearningPanel employeeId={user.employeeId} title="My Learning" />}

      <TeamProgressTab />
    </div>
  );
}
