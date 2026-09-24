import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LookupItem } from '../types';
import { PencilIcon, SearchIcon, TrashIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import ConfirmModal from './ConfirmModal';

interface Props {
  title: string;
  getAll: (token: string) => Promise<LookupItem[]>;
  create: (token: string, name: string) => Promise<LookupItem>;
  update: (token: string, id: string, name: string) => Promise<LookupItem>;
  remove: (token: string, id: string) => Promise<void>;
  // 'list' — Organization's Departments/Designations panels (a vertical
  // list with a count badge per row). 'chips' — Skills' filterable tag
  // cloud (wrapping pill chips, sized by nothing but content).
  variant?: 'list' | 'chips';
  // Shared search text from Master Data's top search bar — when set, it
  // drives filtering instead of this panel's own local search input.
  searchQuery?: string;
  addPlaceholder?: string;
}

export default function LookupManager({
  title,
  getAll,
  create,
  update,
  remove,
  variant = 'list',
  searchQuery,
  addPlaceholder,
}: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [localQuery, setLocalQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<LookupItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  function load() {
    if (!token) return;
    getAll(token)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const effectiveQuery = (searchQuery ?? localQuery).trim().toLowerCase();
  const filtered = useMemo(
    () => (effectiveQuery ? items.filter((i) => i.name.toLowerCase().includes(effectiveQuery)) : items),
    [items, effectiveQuery],
  );

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setError('');
    setAdding(true);
    try {
      await create(token, newName.trim());
      setNewName('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!token || !editingName.trim()) return;
    setError('');
    try {
      await update(token, id, editingName.trim());
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    if (!token || !confirmTarget) return;
    setDeleting(true);
    setError('');
    try {
      await remove(token, confirmTarget.id);
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      setError(err.message);
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const singular = title.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-400">{items.length} total</span>
      </div>

      {searchQuery === undefined && (
        <div className="relative mt-3 mb-4">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <form onSubmit={handleAdd} className="flex gap-2 mb-4 mt-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={addPlaceholder || `Add a new ${singular}`}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={adding} className={`rounded-lg text-sm font-medium px-4 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}>
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">{items.length === 0 ? 'None yet.' : 'No matches.'}</p>
      ) : variant === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {filtered.map((item) =>
            editingId === item.id ? (
              <input
                key={item.id}
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(item.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(item.id)}
                className="rounded-full border border-mitra-accentFrom px-3 py-1.5 text-sm w-40"
              />
            ) : (
              <span
                key={item.id}
                className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1 text-sm text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                {item.name}
                {typeof item.usageCount === 'number' && (
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-100 rounded-full px-1.5 py-0.5">
                    {item.usageCount}
                  </span>
                )}
                <span className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingName(item.name);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-white"
                    title="Rename"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={!!item.usageCount}
                    onClick={() => setConfirmTarget(item)}
                    title={item.usageCount ? `Cannot delete: ${item.usageCount} ${item.usageLabel || 'in use'}.` : 'Delete'}
                    className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </span>
              </span>
            ),
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5 gap-2">
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(item.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(item.id)}
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm mr-2"
                />
              ) : (
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-slate-700 truncate">{item.name}</span>
                  {typeof item.usageCount === 'number' && (
                    <span className="flex-shrink-0 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                      {item.usageCount} {item.usageLabel || ''}
                    </span>
                  )}
                </span>
              )}
              <span className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingName(item.name);
                  }}
                  title="Rename"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmTarget(item)}
                  disabled={!!item.usageCount}
                  title={item.usageCount ? `Cannot delete: ${item.usageCount} ${item.usageLabel || 'in use'}.` : 'Delete'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title={`Delete "${confirmTarget?.name}"?`}
        message="This cannot be undone."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
