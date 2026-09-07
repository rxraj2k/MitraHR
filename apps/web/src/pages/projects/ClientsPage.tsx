import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createClient, deleteClient, getClients, updateClient } from '../../lib/api';
import { Client, ClientStatus } from '../../types';

interface FormState {
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  status: ClientStatus;
  notes: string;
}

const EMPTY: FormState = {
  name: '',
  industry: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  timezone: '',
  status: 'ACTIVE',
  notes: '',
};

function toPayload(f: FormState) {
  return {
    name: f.name.trim(),
    industry: f.industry.trim() || undefined,
    contactName: f.contactName.trim() || undefined,
    contactEmail: f.contactEmail.trim() || undefined,
    contactPhone: f.contactPhone.trim() || undefined,
    timezone: f.timezone.trim() || undefined,
    status: f.status,
    notes: f.notes.trim() || undefined,
  };
}

export default function ClientsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY);

  function load() {
    if (!token) return;
    getClients(token)
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
      await createClient(token, toPayload(newForm));
      setNewForm(EMPTY);
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(item: Client) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      industry: item.industry || '',
      contactName: item.contactName || '',
      contactEmail: item.contactEmail || '',
      contactPhone: item.contactPhone || '',
      timezone: item.timezone || '',
      status: item.status,
      notes: item.notes || '',
    });
  }

  async function handleSave(id: string) {
    if (!token) return;
    setError('');
    try {
      await updateClient(token, id, toPayload(editForm));
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this client?')) return;
    setError('');
    try {
      await deleteClient(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Client Management</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          {showAdd ? 'Cancel' : '+ New Client'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input
              required
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Industry</label>
            <input
              value={newForm.industry}
              onChange={(e) => setNewForm({ ...newForm, industry: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Timezone</label>
            <input
              placeholder="e.g. America/New_York"
              value={newForm.timezone}
              onChange={(e) => setNewForm({ ...newForm, timezone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
            <input
              value={newForm.contactName}
              onChange={(e) => setNewForm({ ...newForm, contactName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contact Email</label>
            <input
              type="email"
              value={newForm.contactEmail}
              onChange={(e) => setNewForm({ ...newForm, contactEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contact Phone</label>
            <input
              value={newForm.contactPhone}
              onChange={(e) => setNewForm({ ...newForm, contactPhone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea
              rows={2}
              value={newForm.notes}
              onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
            >
              Add Client
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Industry</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Timezone</th>
                  <th className="pb-2 font-medium">Projects</th>
                  <th className="pb-2 font-medium">Status</th>
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
                          value={editForm.industry}
                          onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          placeholder="name"
                          value={editForm.contactName}
                          onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm mb-1"
                        />
                        <input
                          placeholder="email"
                          value={editForm.contactEmail}
                          onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={editForm.timezone}
                          onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2 text-slate-400">{item._count?.projects ?? 0}</td>
                      <td className="py-2 pr-2">
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientStatus })}
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
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
                      <td className="py-2 font-medium text-slate-700">{item.name}</td>
                      <td className="py-2 text-slate-500">{item.industry || '—'}</td>
                      <td className="py-2 text-slate-500">
                        {item.contactName || item.contactEmail ? (
                          <span>
                            {item.contactName}
                            {item.contactName && item.contactEmail ? ' · ' : ''}
                            {item.contactEmail}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 text-slate-500">{item.timezone || '—'}</td>
                      <td className="py-2 text-slate-500">{item._count?.projects ?? 0}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
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
      </div>
    </div>
  );
}
