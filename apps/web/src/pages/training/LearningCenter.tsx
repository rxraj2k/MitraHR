import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import MyLearningPanel from '../../components/MyLearningPanel';
import TabBar, { TabBarItem } from '../../components/TabBar';
import { ExternalLinkIcon } from '../../components/icons';
import { resourceLinkLabel } from '../../lib/resourceLinks';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_THEME, TRAINING_CATEGORIES } from '../../lib/trainingCategories';
import {
  assignTraining,
  createTrainingCourse,
  deleteTrainingCourse,
  getEmployees,
  getMyTraining,
  getTrainingCourses,
  getTrainingProgress,
  removeTrainingAssignment,
  updateTrainingAssignmentStatus,
  updateTrainingCourse,
} from '../../lib/api';
import { Employee, EmployeeTraining, TrainingCategory, TrainingCourse, TrainingProgressEntry, TrainingStatus } from '../../types';

type Tab = 'progress' | 'catalog';
const TABS: TabBarItem<Tab>[] = [
  { key: 'progress', label: 'Team Progress', color: 'indigo' },
  { key: 'catalog', label: 'Course Catalog', color: 'fuchsia' },
];

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

interface ResourceRow {
  label: string;
  url: string;
}
interface CourseForm {
  title: string;
  category: TrainingCategory;
  description: string;
  restrictedTo: string;
  active: boolean;
  resources: ResourceRow[];
}
const EMPTY_COURSE: CourseForm = {
  title: '',
  category: 'AGILE_TOOLS',
  description: '',
  restrictedTo: '',
  active: true,
  resources: [{ label: '', url: '' }],
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

function CatalogTab() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_COURSE);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    getTrainingCourses(token, true)
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_COURSE);
    setShowForm(true);
  }

  function startEdit(c: TrainingCourse) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      category: c.category,
      description: c.description || '',
      restrictedTo: c.restrictedTo || '',
      active: c.active,
      resources: c.resources.length ? c.resources.map((r) => ({ label: r.label || '', url: r.url })) : [{ label: '', url: '' }],
    });
    setShowForm(true);
  }

  function updateResource(i: number, field: keyof ResourceRow, value: string) {
    const next = [...form.resources];
    next[i] = { ...next[i], [field]: value };
    setForm({ ...form, resources: next });
  }
  function addResourceRow() {
    setForm({ ...form, resources: [...form.resources, { label: '', url: '' }] });
  }
  function removeResourceRow(i: number) {
    setForm({ ...form, resources: form.resources.filter((_, idx) => idx !== i) });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description || undefined,
        restrictedTo: form.restrictedTo || undefined,
        active: form.active,
        resources: form.resources.filter((r) => r.url.trim()).map((r) => ({ label: r.label || undefined, url: r.url.trim() })),
      };
      if (editingId) {
        await updateTrainingCourse(token, editingId, payload as any);
      } else {
        await createTrainingCourse(token, payload as any);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_COURSE);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this course? Only possible if no one has been assigned it.')) return;
    try {
      await deleteTrainingCourse(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const byCategory = TRAINING_CATEGORIES.map((cat) => ({ category: cat, items: courses.filter((c) => c.category === cat) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{courses.length} courses in the catalog.</p>
        <button
          onClick={() => (showForm ? setShowForm(false) : startAdd())}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Course' : 'New Course'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as TrainingCategory })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {TRAINING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Description / Instructions (optional)</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Only For (optional)</label>
              <input
                placeholder="e.g. DevOps Engineer"
                value={form.restrictedTo}
                onChange={(e) => setForm({ ...form, restrictedTo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-2">Links</label>
            <div className="space-y-2">
              {form.resources.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Label (e.g. Udemy, YouTube)"
                    value={r.label}
                    onChange={(e) => updateResource(i, 'label', e.target.value)}
                    className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="https://..."
                    value={r.url}
                    onChange={(e) => updateResource(i, 'url', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => removeResourceRow(i)} className="text-red-500 hover:text-red-700 text-xs px-2">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addResourceRow} className="text-mitra-accentFrom text-xs mt-2">
              + Add another link
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active (offered when assigning)
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Course'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        byCategory.map(({ category, items }) => {
          const theme = CATEGORY_THEME[category];
          const Icon = CATEGORY_ICONS[category];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.chip}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className={`text-sm font-semibold ${theme.text}`}>{CATEGORY_LABELS[category]}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((c) => (
                  <div key={c.id} className={`rounded-xl border ${theme.border} ${theme.bg} p-4 ${!c.active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-slate-800 text-sm">
                        {c.title}
                        {!c.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
                      </h4>
                    </div>
                    {c.restrictedTo && (
                      <span className="inline-block mt-1 text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500">
                        Only for: {c.restrictedTo}
                      </span>
                    )}
                    {c.description && <p className="text-xs text-slate-600 mt-2">{c.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {c.resources.map((r) => (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600 hover:border-mitra-accentFrom hover:text-mitra-accentFrom"
                        >
                          {resourceLinkLabel(r.url, r.label)}
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => startEdit(c)} className="text-slate-500 hover:text-mitra-accentFrom text-xs">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function LearningCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('progress');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Learning Center</h1>

      {user?.employeeId && <MyLearningPanel employeeId={user.employeeId} title="My Learning" />}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'progress' && <TeamProgressTab />}
      {tab === 'catalog' && <CatalogTab />}
    </div>
  );
}
