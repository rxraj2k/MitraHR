import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createLeaveType, deleteLeaveType, getLeaveTypes, updateLeaveType } from '../lib/api';
import { AccrualMethod, LeaveType } from '../types';

const ACCRUAL_METHODS: AccrualMethod[] = ['MONTHLY', 'UPFRONT', 'NONE'];

interface FormState {
  name: string;
  code: string;
  annualQuota: string;
  accrualMethod: AccrualMethod;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  code: '',
  annualQuota: '',
  accrualMethod: 'MONTHLY',
  isPaid: true,
  carryForwardAllowed: false,
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
    active: f.active,
  };
}

export default function LeaveTypeManager() {
  const { token } = useAuth();
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

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

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this leave type?')) return;
    setError('');
    try {
      await deleteLeaveType(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 md:col-span-2">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Leave Types</h2>
      <p className="text-xs text-slate-500 mb-4">
        Annual quota is total days/year. Leave it blank for unlimited (e.g. Loss of Pay). Can't delete a type
        already used on a request — mark it inactive instead.
      </p>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Quota/yr</th>
                <th className="pb-2 font-medium">Accrual</th>
                <th className="pb-2 font-medium">Paid</th>
                <th className="pb-2 font-medium">Carry Fwd</th>
                <th className="pb-2 font-medium">Active</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) =>
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
                      <input
                        type="number"
                        min={0}
                        value={editForm.annualQuota}
                        onChange={(e) => setEditForm({ ...editForm, annualQuota: e.target.value })}
                        placeholder="unlimited"
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={editForm.accrualMethod}
                        onChange={(e) => setEditForm({ ...editForm, accrualMethod: e.target.value as AccrualMethod })}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {ACCRUAL_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={editForm.isPaid}
                        onChange={(e) => setEditForm({ ...editForm, isPaid: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={editForm.carryForwardAllowed}
                        onChange={(e) => setEditForm({ ...editForm, carryForwardAllowed: e.target.checked })}
                      />
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
                    <td className="py-2">{item.annualQuota == null ? 'Unlimited' : item.annualQuota}</td>
                    <td className="py-2 text-slate-500">{item.accrualMethod}</td>
                    <td className="py-2">{item.isPaid ? 'Yes' : 'No'}</td>
                    <td className="py-2">{item.carryForwardAllowed ? 'Yes' : 'No'}</td>
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

      <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end border-t border-slate-100 pt-4">
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
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Accrual</label>
          <select
            value={newForm.accrualMethod}
            onChange={(e) => setNewForm({ ...newForm, accrualMethod: e.target.value as AccrualMethod })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ACCRUAL_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={newForm.isPaid}
            onChange={(e) => setNewForm({ ...newForm, isPaid: e.target.checked })}
          />
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
        <div className="col-span-2 md:col-span-6">
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
          >
            Add Leave Type
          </button>
        </div>
      </form>
    </div>
  );
}
