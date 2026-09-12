import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import { EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS, getExpiryStatus } from '../../lib/documentCategories';
import {
  createClient,
  createClientContract,
  deleteClient,
  deleteClientContract,
  getClientContracts,
  getClients,
  openClientContractFile,
  updateClient,
  updateClientContract,
} from '../../lib/api';
import { Client, ClientContract, ClientContractStatus, ClientStatus } from '../../types';

type Tab = 'clients' | 'contracts';
const TABS: TabBarItem<Tab>[] = [
  { key: 'clients', label: 'Clients', color: 'indigo' },
  { key: 'contracts', label: 'Contracts', color: 'teal' },
];

const CONTRACT_STATUSES: ClientContractStatus[] = ['ACTIVE', 'RENEWED', 'TERMINATED'];
const CONTRACT_STATUS_BADGE: Record<ClientContractStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  RENEWED: 'bg-sky-100 text-sky-700',
  TERMINATED: 'bg-slate-100 text-slate-500',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

function ClientsTab() {
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
        <div />
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

interface ContractFormState {
  clientId: string;
  title: string;
  contractType: string;
  startDate: string;
  endDate: string;
  value: string;
  status: ClientContractStatus;
  notes: string;
}

const EMPTY_CONTRACT: ContractFormState = {
  clientId: '',
  title: '',
  contractType: '',
  startDate: '',
  endDate: '',
  value: '',
  status: 'ACTIVE',
  notes: '',
};

function ContractsTab() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState('');
  const [renewalFilter, setRenewalFilter] = useState('');

  const [form, setForm] = useState<ContractFormState>(EMPTY_CONTRACT);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ContractFormState>(EMPTY_CONTRACT);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [c, ct] = await Promise.all([getClients(token), getClientContracts(token)]);
      setClients(c);
      setContracts(ct);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !form.clientId || !form.title.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      await createClientContract(
        token,
        {
          clientId: form.clientId,
          title: form.title.trim(),
          contractType: form.contractType.trim() || undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          value: form.value.trim() || undefined,
          status: form.status,
          notes: form.notes.trim() || undefined,
        },
        file || undefined,
      );
      setForm(EMPTY_CONTRACT);
      setFile(null);
      setFileInputKey((k) => k + 1);
      setMessage('Contract logged.');
      load();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: ClientContract) {
    setEditingId(c.id);
    setEditForm({
      clientId: c.clientId,
      title: c.title,
      contractType: c.contractType || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      value: c.value || '',
      status: c.status,
      notes: c.notes || '',
    });
  }

  async function saveEdit(id: string) {
    if (!token) return;
    try {
      await updateClientContract(token, id, {
        title: editForm.title.trim(),
        contractType: editForm.contractType.trim() || undefined,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        value: editForm.value.trim() || undefined,
        status: editForm.status,
        notes: editForm.notes.trim() || undefined,
      });
      setEditingId(null);
      load();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  async function handleDelete(c: ClientContract) {
    if (!token) return;
    if (!confirm(`Delete the contract "${c.title}"? This can't be undone.`)) return;
    await deleteClientContract(token, c.id);
    load();
  }

  const filtered = contracts.filter((c) => {
    if (clientFilter && c.clientId !== clientFilter) return false;
    if (renewalFilter && getExpiryStatus(c.endDate) !== renewalFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Log a Contract</h2>
        <p className="text-xs text-slate-500 mb-4">
          A renewal alert fires automatically 7, 3, 1, and 0 days before the end date.
        </p>
        {message && <div className="text-sm text-slate-600 mb-3">{message}</div>}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Client</label>
            <select
              required
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Title</label>
            <input
              required
              placeholder="e.g. Master Services Agreement"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <input
              placeholder="e.g. MSA, SOW, NDA"
              value={form.contractType}
              onChange={(e) => setForm({ ...form, contractType: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientContractStatus })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {CONTRACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Value (optional)</label>
            <input
              placeholder="e.g. $50,000 / yr"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Signed Copy (optional)</label>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Log Contract'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Client Contracts</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={renewalFilter}
              onChange={(e) => setRenewalFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">Any renewal status</option>
              <option value="EXPIRED">Expired</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="VALID">Valid</option>
              <option value="NONE">No End Date</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500 text-sm">No contracts match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Title / Type</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Renewal</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const isEditing = editingId === c.id;
                  const renewal = getExpiryStatus(c.endDate);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 align-top">
                      <td className="py-2 font-medium text-slate-700">{c.client?.name || '—'}</td>
                      <td className="py-2 text-slate-600">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              placeholder="Type"
                              value={editForm.contractType}
                              onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value })}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-slate-700">{c.title}</div>
                            {c.contractType && <div className="text-xs text-slate-400">{c.contractType}</div>}
                          </>
                        )}
                      </td>
                      <td className="py-2 text-slate-500">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={editForm.startDate}
                              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="date"
                              value={editForm.endDate}
                              onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <span>
                            {formatDate(c.startDate)} – {formatDate(c.endDate)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-500">
                        {isEditing ? (
                          <input
                            value={editForm.value}
                            onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        ) : (
                          c.value || '—'
                        )}
                      </td>
                      <td className="py-2">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientContractStatus })}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            {CONTRACT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_BADGE[c.status]}`}>
                            {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[renewal]}`}>
                          {EXPIRY_STATUS_LABELS[renewal]}
                        </span>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(c.id)} className="text-xs text-emerald-600 hover:underline mr-3">
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {c.fileUrl && (
                              <button
                                onClick={() => token && openClientContractFile(token, c.id)}
                                className="text-xs text-mitra-accentFrom hover:underline mr-3"
                              >
                                View
                              </button>
                            )}
                            <button onClick={() => startEdit(c)} className="text-xs text-slate-500 hover:underline mr-3">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(c)} className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [tab, setTab] = useState<Tab>('clients');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Client Management</h1>
        <p className="text-sm text-slate-500 mt-1">Client records and their contracts, with renewal alerts built in.</p>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'clients' && <ClientsTab />}
      {tab === 'contracts' && <ContractsTab />}
    </div>
  );
}
