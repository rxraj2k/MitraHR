import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LookupItem } from '../types';

interface Props {
  title: string;
  getAll: (token: string) => Promise<LookupItem[]>;
  create: (token: string, name: string) => Promise<LookupItem>;
  update: (token: string, id: string, name: string) => Promise<LookupItem>;
  remove: (token: string, id: string) => Promise<void>;
}

export default function LookupManager({ title, getAll, create, update, remove }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    getAll(token)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setError('');
    try {
      await create(token, newName.trim());
      setNewName('');
      load();
    } catch (err: any) {
      setError(err.message);
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

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this entry?')) return;
    setError('');
    try {
      await remove(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">{title}</h2>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`Add a new ${title.toLowerCase().replace(/s$/, '')}`}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          Add
        </button>
      </form>
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500 text-sm">None yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2">
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
                <span className="text-sm text-slate-700">{item.name}</span>
              )}
              <div className="flex gap-3 text-xs flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingName(item.name);
                  }}
                  className="text-slate-500 hover:text-mitra-accentFrom"
                >
                  Rename
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
