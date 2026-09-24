import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createLeaveType, deleteLeaveType, getLeaveTypes, updateLeaveType } from '../lib/api';
import { AccrualMethod, LeaveType } from '../types';
import { PencilIcon, TrashIcon } from './icons';
import { PRIMARY_BUTTON_3D } from '../lib/buttonStyles';
import ConfirmModal from './ConfirmModal';

const ACCRUAL_METHODS: AccrualMethod[] = ['MONTHLY', 'UPFRONT', 'NONE'];
const ACCRUAL_LABELS: Record<AccrualMethod, string> = { MONTHLY: 'Monthly accrual', UPFRONT: 'Upfront', NONE: 'No accrual' };

interface FormState {
  name: string;
  code: string;
  annualQuota: string;
  accrualMethod: AccrualMethod;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  isCompOff: boolean;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  code: '',
  annualQuota: '',
  accrualMethod: 'MONTHLY',
  isPaid: true,
  carryForwardAllowed: false,
  isCompOff: false,
  active: true,
};

function toPayload(f: FormState) {
  return {
    name: f.name.trim(),
    code: f.code.trim() || undefined,
    annualQuota: f.annualQuota === '' ? null : Number(f.annualQuota),
    accrualMethod: f.accrualMethod,
    isPaid: f.isPaid,
    carryForwardAllowed: f.carryForwardAllowed,
    isCompOff: f.isCompOff,
    active: f.active,
  };
}

function Pill({ tone, children }: { tone: 'slate' | 'emerald' | 'amber' | 'sky' | 'rose'; children: React.ReactNode }) {
  const TONE: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE[tone]}`}>{children}</span>;
}

export default function LeaveTypeManager() {
  const { token } = useAuth();
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);
  const [confirmTarget, setConfirmTarget] = useState<LeaveType | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    if (!token) return;
    getLeaveTypes(token)
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
      await createLeaveType(token, toPayload(newForm) as any);
      setNewForm(EMPTY);
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: LeaveType) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      code: item.code || '',
      annualQuota: item.annualQuota == null ? '' : String(item.annualQuota),
      accrualMethod: item.accrualMethod,
      isPaid: item.isPaid,
      carryForwardAllowed: item.carryForwardAllowed,
      isCompOff: item.isCompOff,
      active: item.active,
    });
  }

  async function handleSave(id: string) {
    if (!token) return;
    setError('');
    try {
      await updateLeaveType(token, id, toPayload(editForm) as any);
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
      await deleteLeaveType(token, confirmTarget.id);
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-800">Leave Types</h2>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}
        >
          {showAdd ? 'Cancel' : '+ Add Leave Type'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Annual quota is total days/year — blank means unlimited (e.g. Loss of Pay). "Comp-off" types are earned via
        the Comp-Off tracker instead of a quota. Can't delete a type already used on a request — mark it inactive
        instead.
      </p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {showAdd && (
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50">
          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Quota/yr</label>
            <input
              type="number"
              min={0}
              value={newForm.annualQuota}
              onChange={(e) => setNewForm({ ...newForm, annualQuota: e.target.value })}
              placeholder="unlimited"
              disabled={newForm.isCompOff}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Accrual</label>
            <select
              value={newForm.accrualMethod}
              onChange={(e) => setNewForm({ ...newForm, accrualMethod: e.target.value as AccrualMethod })}
              disabled={newForm.isCompOff}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            >
              {ACCRUAL_METHODS.map((m) => (
                <option key={m} value={m}>
                  {ACCRUAL_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={newForm.isPaid} onChange={(e) => setNewForm({ ...newForm, isPaid: e.target.checked })} />
            Paid
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={newForm.carryForwardAllowed}
              onChange={(e) => setNewForm({ ...newForm, carryForwardAllowed: e.target.checked })}
            />
            Carry fwd
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={newForm.isCompOff} onChange={(e) => setNewForm({ ...newForm, isCompOff: e.target.checked })} />
            Comp-off
          </label>
          <div className="col-span-2 md:col-span-6">
            <button type="submit" className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500 text-sm">None yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={editForm.annualQuota}
                    onChange={(e) => setEditForm({ ...editForm, annualQuota: e.target.value })}
                    placeholder="unlimited"
                    disabled={editForm.isCompOff}
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <select
                    value={editForm.accrualMethod}
                    onChange={(e) => setEditForm({ ...editForm, accrualMethod: e.target.value as AccrualMethod })}
                    disabled={editForm.isCompOff}
                    className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {ACCRUAL_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {ACCRUAL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={editForm.isPaid} onChange={(e) => setEditForm({ ...editForm, isPaid: e.target.checked })} />
                    Paid
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={editForm.carryForwardAllowed}
                      onChange={(e) => setEditForm({ ...editForm, carryForwardAllowed: e.target.checked })}
                    />
                    Carry fwd
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={editForm.isCompOff} onChange={(e) => setEditForm({ ...editForm, isCompOff: e.target.checked })} />
                    Comp-off
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} />
                    Active
                  </label>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => handleSave(item.id)} className="text-mitra-accentFrom text-xs font-medium">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                className={`rounded-xl border border-slate-200 p-4 ${!item.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                    {item.code && <p className="text-[11px] text-slate-400 font-mono">{item.code}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmTarget(item)}
                      disabled={!!item.usageCount}
                      title={item.usageCount ? `Cannot delete: ${item.usageCount} ${item.usageLabel}.` : 'Delete'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone="sky">{item.isCompOff ? 'Earned (comp-off)' : item.annualQuota == null ? 'Unlimited' : `${item.annualQuota} days/yr`}</Pill>
                  {!item.isCompOff && <Pill tone="slate">{ACCRUAL_LABELS[item.accrualMethod]}</Pill>}
                  <Pill tone={item.isPaid ? 'emerald' : 'rose'}>{item.isPaid ? 'Paid' : 'Unpaid'}</Pill>
                  {item.carryForwardAllowed && <Pill tone="amber">Carry forward</Pill>}
                  {!item.active && <Pill tone="slate">Inactive</Pill>}
                </div>
                {typeof item.usageCount === 'number' && item.usageCount > 0 && (
                  <p className="text-[11px] text-indigo-500 mt-2">
                    {item.usageCount} {item.usageLabel}
                  </p>
                )}
              </div>
            ),
          )}
        </div>
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
