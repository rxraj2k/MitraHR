import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createTechnology, deleteTechnology, getTechnologies, updateTechnology } from '../lib/api';
import { ProjectCategory, Technology } from '../types';

const CATEGORIES: ProjectCategory[] = ['DEVOPS', 'IAM', 'ACTIVE_DIRECTORY', 'CLOUD_SECURITY', 'CYBER_SECURITY'];

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  DEVOPS: 'DevOps',
  IAM: 'IAM',
  ACTIVE_DIRECTORY: 'Active Directory',
  CLOUD_SECURITY: 'Cloud Security',
  CYBER_SECURITY: 'Cyber Security',
};

interface FormState {
  name: string;
  category: ProjectCategory;
  active: boolean;
}

const EMPTY: FormState = { name: '', category: 'DEVOPS', active: true };

export default function TechnologyManager() {
  const { token } = useAuth();
  const [items, setItems] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ProjectCategory | 'ALL'>('ALL');
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

  function load() {
    if (!token) return;
    getTechnologies(token)
      .then(setItems)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !newForm.name.trim()) return;
    setError('');
    try {
      await createTechnology(token, { name: newForm.name.trim(), category: newForm.category, active: newForm.active });
      setNewForm({ ...EMPTY, category: newForm.category });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: Technology) {
    setEditingId(item.id);
    setEditForm({ name: item.name, category: item.category, active: item.active });
  }

  async function handleSave(id: string) {
    if (!token) return;
    setError('');
    try {
      await updateTechnology(token, id, { name: editForm.name.trim(), category: editForm.category, active: editForm.active });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this technology?')) return;
    setError('');
    try {
      await deleteTechnology(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const shown = filter === 'ALL' ? items : items.filter((t) => t.category === filter);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 md:col-span-2">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Technologies</h2>
      <p className="text-xs text-slate-500 mb-4">
        The "specific area or tool" list on the Project form, grouped by category. Can't delete one already used on
        a project — mark it inactive instead.
      </p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="flex flex-wrap gap-2 text-xs mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-lg ${filter === 'ALL' ? 'bg-mitra-navy text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-lg ${filter === c ? 'bg-mitra-navy text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {CATEGORY_LABELS[c]} ({items.filter((t) => t.category === c).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="overflow-x-auto mb-4 max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Active</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id}>
                    <td className="py-2 pr-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as ProjectCategory })}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => handleSave(item.id)} className="text-mitra-accentFrom text-xs mr-3">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id}>
                    <td className="py-2">
                      {item.name}
                      {!item.active && <span className="ml-2 text-xs text-slate-400">(inactive)</span>}
                    </td>
                    <td className="py-2 text-slate-500">{CATEGORY_LABELS[item.category]}</td>
                    <td className="py-2">{item.active ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-slate-500 hover:text-mitra-accentFrom text-xs mr-3"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end border-t border-slate-100 pt-4">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Name</label>
          <input
            value={newForm.name}
            onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Category</label>
          <select
            value={newForm.category}
            onChange={(e) => setNewForm({ ...newForm, category: e.target.value as ProjectCategory })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
          >
            Add Technology
          </button>
        </div>
      </form>
    </div>
  );
}
