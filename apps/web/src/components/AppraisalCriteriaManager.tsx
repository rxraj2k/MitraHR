import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppraisalCriterion } from '../types';
import {
  createAppraisalCriterion,
  deleteAppraisalCriterion,
  getAppraisalCriteria,
  updateAppraisalCriterion,
} from '../lib/api';
import { HUE_GRADIENTS } from '../lib/buttonStyles';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import { PencilIcon, PlusCircleIcon, SearchIcon, TrashIcon } from './icons';
import ConfirmModal from './ConfirmModal';

const CARD_GRADIENTS = [
  HUE_GRADIENTS.indigo,
  HUE_GRADIENTS.emerald,
  HUE_GRADIENTS.amber,
  HUE_GRADIENTS.rose,
  HUE_GRADIENTS.violet,
  HUE_GRADIENTS.sky,
  HUE_GRADIENTS.fuchsia,
  HUE_GRADIENTS.lime,
];

interface FormState {
  name: string;
  description: string;
  weight: string;
}

const EMPTY_FORM: FormState = { name: '', description: '', weight: '' };

// The 6-Month Self-Appraisal's scorecard, made editable so HR can rebalance
// weights or reword criteria without a code change (the original spec's 5
// criteria are just the seed data here, not hardcoded anywhere downstream —
// AppraisalsService reads whatever is active from this table).
export default function AppraisalCriteriaManager({ searchQuery }: { searchQuery?: string }) {
  const { token } = useAuth();
  const [items, setItems] = useState<AppraisalCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [confirmTarget, setConfirmTarget] = useState<AppraisalCriterion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [localQuery, setLocalQuery] = useState('');

  function load() {
    if (!token) return;
    getAppraisalCriteria(token)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const activeTotal = items.filter((c) => c.active).reduce((sum, c) => sum + c.weight, 0);
  const totalIsBalanced = Math.round(activeTotal * 100) / 100 === 100;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token || !addForm.name.trim() || !addForm.weight) return;
    setSaving(true);
    setError('');
    try {
      await createAppraisalCriterion(token, {
        name: addForm.name.trim(),
        description: addForm.description.trim() || undefined,
        weight: Number(addForm.weight),
      });
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: AppraisalCriterion) {
    setEditingId(c.id);
    setEditForm({ name: c.name, description: c.description || '', weight: String(c.weight) });
  }

  async function saveEdit(c: AppraisalCriterion) {
    if (!token || !editForm.name.trim() || !editForm.weight) return;
    setSaving(true);
    setError('');
    try {
      await updateAppraisalCriterion(token, c.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        weight: Number(editForm.weight),
        sortOrder: c.sortOrder,
        active: c.active,
      });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: AppraisalCriterion) {
    if (!token) return;
    setError('');
    try {
      await updateAppraisalCriterion(token, c.id, {
        name: c.name,
        description: c.description || undefined,
        weight: c.weight,
        sortOrder: c.sortOrder,
        active: !c.active,
      });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function move(c: AppraisalCriterion, direction: -1 | 1) {
    if (!token) return;
    const effectiveQuery = (searchQuery ?? localQuery).trim().toLowerCase();
  const sorted = [...items]
    .filter((c) => !effectiveQuery || c.name.toLowerCase().includes(effectiveQuery))
    .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((i) => i.id === c.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    setError('');
    try {
      await Promise.all([
        updateAppraisalCriterion(token, c.id, {
          name: c.name,
          description: c.description || undefined,
          weight: c.weight,
          sortOrder: swapWith.sortOrder,
          active: c.active,
        }),
        updateAppraisalCriterion(token, swapWith.id, {
          name: swapWith.name,
          description: swapWith.description || undefined,
          weight: swapWith.weight,
          sortOrder: c.sortOrder,
          active: swapWith.active,
        }),
      ]);
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
      await deleteAppraisalCriterion(token, confirmTarget.id);
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      setError(err.message);
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Appraisal Criteria</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            The weighted scorecard used by the 6-Month Self-Appraisal — editable here, no code change needed.
          </p>
        </div>
        <span
          className={`text-xs font-semibold rounded-full px-3 py-1 ${
            totalIsBalanced
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
          }`}
        >
          Active weights total {activeTotal}% {totalIsBalanced ? '✓' : '(should be 100%)'}
        </span>
      </div>

      {searchQuery === undefined && (
        <div className="relative mt-3">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search criteria..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700"
          />
        </div>
      )}

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm mt-4">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          {sorted.map((c, i) => {
            const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
            const isEditing = editingId === c.id;
            return (
              <div
                key={c.id}
                className={`relative rounded-2xl border overflow-hidden transition-opacity ${
                  c.active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-50'
                }`}
              >
                <div className={`h-1.5 ${gradient}`} />
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                        placeholder="Criterion name"
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                        placeholder="Evaluation scope / description"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.weight}
                          onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        />
                        <span className="text-xs text-slate-400">% weight</span>
                        <div className="flex-1" />
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 px-2 py-1">
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(c)}
                          disabled={saving}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}</h3>
                        <span className={`flex-shrink-0 text-white text-xs font-bold rounded-full px-2.5 py-1 ${gradient}`}>
                          {c.weight}%
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">{c.description}</p>
                      )}
                      {typeof c.usageCount === 'number' && c.usageCount > 0 && (
                        <p className="text-[11px] text-indigo-500 dark:text-indigo-300 mt-1.5">
                          {c.usageCount} {c.usageLabel}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${
                            c.active
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {c.active ? 'Active' : 'Inactive — click to activate'}
                        </button>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => move(c, -1)}
                            title="Move up"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(c, 1)}
                            title="Move down"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmTarget(c)}
                            title={c.usageCount ? `Cannot delete: ${c.usageCount} ${c.usageLabel}.` : 'Delete'}
                            className={`p-1.5 rounded-lg ${
                              c.usageCount
                                ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50'
                            }`}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd ? (
        <form onSubmit={handleAdd} className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <input
            autoFocus
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            placeholder="Criterion name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            rows={2}
            placeholder="Evaluation scope / description (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={addForm.weight}
              onChange={(e) => setAddForm({ ...addForm, weight: e.target.value })}
              placeholder="Weight"
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="text-xs text-slate-400">% weight</span>
            <div className="flex-1" />
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-slate-500 px-3 py-2">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}>
              Add Criterion
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-3 text-sm font-medium text-slate-500 hover:border-mitra-accentFrom hover:text-mitra-accentFrom transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> Add Criterion
        </button>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        singleAction={!!confirmTarget?.usageCount}
        title={confirmTarget?.usageCount ? `Cannot delete "${confirmTarget?.name}"` : `Delete "${confirmTarget?.name}"?`}
        message={
          confirmTarget?.usageCount
            ? `${confirmTarget.usageCount} ${confirmTarget.usageLabel}. Mark it inactive instead — deleting would silently blank out that historical review data.`
            : 'This cannot be undone.'
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
