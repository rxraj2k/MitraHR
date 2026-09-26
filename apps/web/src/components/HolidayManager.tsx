import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createHoliday, deleteHoliday, getHolidays, updateHoliday } from '../lib/api';
import { Holiday, HolidayRegion, HolidayType } from '../types';
import { PencilIcon, TrashIcon } from './icons';
import { PRIMARY_BUTTON_3D, TOGGLE_3D_INACTIVE, toggle3dActive, HUE_GRADIENTS } from '../lib/buttonStyles';
import ConfirmModal from './ConfirmModal';

const REGION_TABS: { key: HolidayRegion | 'ALL'; label: string; flag: string }[] = [
  { key: 'ALL', label: 'All', flag: '📅' },
  { key: 'US', label: 'US Calendar', flag: '🇺🇸' },
  { key: 'INDIA', label: 'India Calendar', flag: '🇮🇳' },
  { key: 'COMPANY', label: 'Company', flag: '🏢' },
];

const HOLIDAY_TYPES: HolidayType[] = ['NATIONAL', 'REGIONAL', 'FLOATING'];

const TYPE_BADGE: Record<HolidayType, string> = {
  NATIONAL: 'bg-indigo-100 text-indigo-700',
  REGIONAL: 'bg-sky-100 text-sky-700',
  FLOATING: 'bg-amber-100 text-amber-700',
};

const TYPE_LABELS: Record<HolidayType, string> = {
  NATIONAL: 'National',
  REGIONAL: 'Regional',
  FLOATING: 'Floating',
};

interface FormState {
  name: string;
  date: string;
  region: HolidayRegion;
  type: HolidayType;
}

const EMPTY: FormState = { name: '', date: '', region: 'US', type: 'NATIONAL' };

export default function HolidayManager({ searchQuery }: { searchQuery?: string } = {}) {
  const { token } = useAuth();
  const [items, setItems] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regionTab, setRegionTab] = useState<HolidayRegion | 'ALL'>('ALL');
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [confirmTarget, setConfirmTarget] = useState<Holiday | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setNewForm({ ...EMPTY, region: newForm.region });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: Holiday) {
    setEditingId(item.id);
    setEditForm({ name: item.name, date: item.date.slice(0, 10), region: item.region, type: item.type || 'NATIONAL' });
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

  async function confirmDelete() {
    if (!token || !confirmTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deleteHoliday(token, confirmTarget.id);
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      setError(err.message);
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const effectiveQuery = (searchQuery ?? '').trim().toLowerCase();
  const shown = useMemo(
    () =>
      items
        .filter((i) => regionTab === 'ALL' || i.region === regionTab)
        .filter((i) => !effectiveQuery || i.name.toLowerCase().includes(effectiveQuery))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items, regionTab, effectiveQuery],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Holidays</h2>
      <p className="text-xs text-slate-500 mb-4">Every row here counts as a company day off, regardless of calendar.</p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="flex flex-wrap gap-2 text-xs mb-4">
        {REGION_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setRegionTab(t.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
              regionTab === t.key ? toggle3dActive(HUE_GRADIENTS.indigo) : TOGGLE_3D_INACTIVE
            }`}
          >
            {t.flag} {t.label} ({t.key === 'ALL' ? items.length : items.filter((i) => i.region === t.key).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-slate-500 text-sm mb-4">
          {items.length === 0 ? 'No holidays in this calendar yet.' : 'No matches.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto mb-4">
          {shown.map((item) =>
            editingId === item.id ? (
              <li key={item.id} className="py-2.5 flex flex-wrap gap-2 items-center">
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
                  {REGION_TABS.filter((r) => r.key !== 'ALL').map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as HolidayType })}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
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
              <li key={item.id} className="py-2.5 flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 font-mono flex-shrink-0">{item.date.slice(0, 10)}</span>
                  <span className="truncate">{item.name}</span>
                  <span
                    className={`flex-shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5 ${TYPE_BADGE[item.type || 'NATIONAL']}`}
                  >
                    {TYPE_LABELS[item.type || 'NATIONAL']}
                  </span>
                </span>
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
                    title="Delete"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
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
          {REGION_TABS.filter((r) => r.key !== 'ALL').map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={newForm.type}
          onChange={(e) => setNewForm({ ...newForm, type: e.target.value as HolidayType })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {HOLIDAY_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="submit" className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
          Add
        </button>
      </form>

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
