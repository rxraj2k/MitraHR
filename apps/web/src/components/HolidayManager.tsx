import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHoliday, deleteHoliday, getHolidays, updateHoliday } from '../lib/api';
import { Holiday, HolidayRegion } from '../types';

const REGIONS: HolidayRegion[] = ['US', 'INDIA', 'COMPANY'];

interface FormState {
  name: string;
  date: string;
  region: HolidayRegion;
}

const EMPTY: FormState = { name: '', date: '', region: 'US' };

export default function HolidayManager() {
  const { token } = useAuth();
  const [items, setItems] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

  function load() {
    if (!token) return;
    getHolidays(token)
      .then(setItems)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !newForm.name.trim() || !newForm.date) return;
    setError('');
    try {
      await createHoliday(token, newForm);
      setNewForm(EMPTY);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: Holiday) {
    setEditingId(item.id);
    setEditForm({ name: item.name, date: item.date.slice(0, 10), region: item.region });
  }

  async function handleSave(id: string) {
    if (!token) return;
    setError('');
    try {
      await updateHoliday(token, id, editForm);
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this holiday?')) return;
    setError('');
    try {
      await deleteHoliday(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Holidays</h2>
      <p className="text-xs text-slate-500 mb-4">US calendar (primary) + India — every row here counts as a company day off.</p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto mb-4">
          {sorted.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="py-2 flex flex-wrap gap-2 items-center">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="flex-1 min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <select
                  value={editForm.region}
                  onChange={(e) => setEditForm({ ...editForm, region: e.target.value as HolidayRegion })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleSave(item.id)} className="text-mitra-accentFrom text-xs">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">
                  Cancel
                </button>
              </li>
            ) : (
              <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {item.date.slice(0, 10)} — {item.name} <span className="text-xs text-slate-400">({item.region})</span>
                </span>
                <span className="flex gap-3 text-xs flex-shrink-0">
                  <button onClick={() => startEdit(item)} className="text-slate-500 hover:text-mitra-accentFrom">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={newForm.name}
          onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
          placeholder="Holiday name"
          className="flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={newForm.date}
          onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={newForm.region}
          onChange={(e) => setNewForm({ ...newForm, region: e.target.value as HolidayRegion })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          Add
        </button>
      </form>
    </div>
  );
}
