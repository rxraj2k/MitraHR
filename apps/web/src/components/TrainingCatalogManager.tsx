import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ExternalLinkIcon } from './icons';
import { resourceLinkLabel } from '../lib/resourceLinks';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_THEME, TRAINING_CATEGORIES } from '../lib/trainingCategories';
import { createTrainingCourse, deleteTrainingCourse, getTrainingCourses, updateTrainingCourse } from '../lib/api';
import { TrainingCategory, TrainingCourse } from '../types';

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

// The catalog of onboarding/training courses — what exists, not who's
// assigned to it. Lives in Master Data alongside Technology (a lookup used
// the same way by Project Management) rather than inside the Learning
// Center, which is purely about tracking progress against this catalog.
export default function TrainingCatalogManager() {
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
        <p className="text-sm text-slate-500">{courses.length} courses in the catalog — used by the Learning Center's Team Progress and Assign Standard Curriculum.</p>
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
