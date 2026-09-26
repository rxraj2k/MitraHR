import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createAssetCategory, deleteAssetCategory, getAssetCategories, updateAssetCategory } from '../lib/api';
import { AssetCategoryItem, AssetCategoryKind } from '../types';
import { PencilIcon, TrashIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import ConfirmModal from './ConfirmModal';

const KIND_BADGE: Record<AssetCategoryKind, string> = {
  HARDWARE: 'bg-sky-100 text-sky-700',
  SOFTWARE: 'bg-violet-100 text-violet-700',
};

// Asset Categories half of the Assets & Docs tab — same list/rename/delete
// shape as LookupManager, plus the HARDWARE/SOFTWARE kind tag the plain
// name-only lookup doesn't have room for.
export default function AssetCategoryManager({ searchQuery }: { searchQuery?: string }) {
  const { token } = useAuth();
  const [items, setItems] = useState<AssetCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<AssetCategoryKind>('HARDWARE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<AssetCategoryKind>('HARDWARE');
  const [confirmTarget, setConfirmTarget] = useState<AssetCategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    if (!token) return;
    getAssetCategories(token)
      .then(setItems)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const effectiveQuery = (searchQuery || '').trim().toLowerCase();
  const filtered = useMemo(
    () => (effectiveQuery ? items.filter((i) => i.name.toLowerCase().includes(effectiveQuery)) : items),
    [items, effectiveQuery],
  );

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setError('');
    try {
      await createAssetCategory(token, { name: newName.trim(), kind: newKind });
      setNewName('');
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: AssetCategoryItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditKind(item.kind);
  }

  async function handleSave(id: string) {
    if (!token || !editName.trim()) return;
    setError('');
    try {
      await updateAssetCategory(token, id, { name: editName.trim(), kind: editKind });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    if (!token || !confirmTarget) return;
    setDeleting(true);
    try {
      await deleteAssetCategory(token, confirmTarget.id);
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      setError(err.message);
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Asset Categories</h2>
        <span className="text-xs text-slate-400">{items.length} total</span>
      </div>
      <p className="text-xs text-slate-500 mt-1 mb-4">Hardware/software types offered on the Asset Management "Add Asset" form.</p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a new category"
          className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as AssetCategoryKind)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </select>
        <button type="submit" className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">{items.length === 0 ? 'None yet.' : 'No matches.'}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5 gap-2">
              {editingId === item.id ? (
                <span className="flex-1 flex gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value as AssetCategoryKind)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SOFTWARE">Software</option>
                  </select>
                  <button onClick={() => handleSave(item.id)} className="text-mitra-accentFrom text-xs">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">
                    Cancel
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-slate-700 truncate">{item.name}</span>
                  <span className={`flex-shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5 ${KIND_BADGE[item.kind]}`}>
                    {item.kind === 'HARDWARE' ? 'Hardware' : 'Software'}
                  </span>
                  {typeof item.usageCount === 'number' && item.usageCount > 0 && (
                    <span className="flex-shrink-0 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                      {item.usageCount} {item.usageLabel}
                    </span>
                  )}
                </span>
              )}
              {editingId !== item.id && (
                <span className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    title="Edit"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmTarget(item)}
                    title={item.usageCount ? `Cannot delete: ${item.usageCount} ${item.usageLabel}.` : 'Delete'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.usageCount
                        ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        singleAction={!!confirmTarget?.usageCount}
        title={confirmTarget?.usageCount ? `Cannot delete "${confirmTarget?.name}"` : `Delete "${confirmTarget?.name}"?`}
        message={
          confirmTarget?.usageCount
            ? `${confirmTarget.usageCount} ${confirmTarget.usageLabel}. Mark it inactive instead.`
            : 'This cannot be undone.'
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
