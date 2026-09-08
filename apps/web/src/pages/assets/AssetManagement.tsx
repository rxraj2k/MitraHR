import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_THEME,
  CONDITION_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
} from '../../lib/assetCategories';
import {
  assignAsset,
  createAsset,
  deleteAsset,
  getAsset,
  getAssets,
  getEmployees,
  returnAsset,
  setAssetStatus,
  updateAsset,
} from '../../lib/api';
import { Asset, AssetCategory, AssetStatus, Employee } from '../../types';

interface AssetForm {
  assetTag: string;
  category: AssetCategory;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  notes: string;
}
const EMPTY_ASSET: AssetForm = {
  assetTag: '',
  category: 'LAPTOP',
  name: '',
  serialNumber: '',
  purchaseDate: '',
  notes: '',
};

const STATUS_TILE_ORDER: AssetStatus[] = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'LOST'];
const STATUS_TILE_COLOR: Record<AssetStatus, string> = {
  AVAILABLE: 'text-green-600',
  ASSIGNED: 'text-indigo-600',
  IN_REPAIR: 'text-amber-600',
  RETIRED: 'text-slate-500',
  LOST: 'text-red-600',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

// The expanded row for one asset: full assignment history, plus whichever
// action makes sense right now (Assign when free, Return when out,
// otherwise a quick status correction).
function AssetDetail({
  asset,
  employees,
  onChanged,
}: {
  asset: Asset;
  employees: Employee[];
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignCondition, setAssignCondition] = useState('GOOD');

  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnStatus, setReturnStatus] = useState('AVAILABLE');
  const [returnNotes, setReturnNotes] = useState('');

  function load() {
    if (!token) return;
    getAsset(token, asset.id)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, asset.id]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!token || !assignEmployeeId) return;
    setBusy(true);
    setError('');
    try {
      await assignAsset(token, asset.id, { employeeId: assignEmployeeId, conditionAtAssignment: assignCondition });
      setAssignEmployeeId('');
      load();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await returnAsset(token, asset.id, {
        conditionAtReturn: returnCondition,
        resultingStatus: returnStatus,
        returnNotes: returnNotes || undefined,
      });
      setReturnNotes('');
      load();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickStatus(status: string) {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await setAssetStatus(token, asset.id, status);
      load();
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const holderName = (id: string) => employees.find((e) => e.id === id)?.fullName || 'Unknown';

  return (
    <div className="px-4 py-4 bg-slate-50 space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}

      {asset.status === 'AVAILABLE' && (
        <form onSubmit={handleAssign} className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-3">Assign this asset</h4>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Employee</label>
              <select
                required
                value={assignEmployeeId}
                onChange={(e) => setAssignEmployeeId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm min-w-[180px]"
              >
                <option value="">Select...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Condition handed out</label>
              <select
                value={assignCondition}
                onChange={(e) => setAssignCondition(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {ASSET_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </form>
      )}

      {asset.status === 'ASSIGNED' && (
        <form onSubmit={handleReturn} className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-slate-600 mb-3">Mark returned</h4>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Condition on return</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                {ASSET_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Send it to</label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="AVAILABLE">Available (back in circulation)</option>
                <option value="IN_REPAIR">In Repair</option>
                <option value="RETIRED">Retired</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
              <input
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g. minor scratch on lid"
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
            >
              Mark Returned
            </button>
          </div>
        </form>
      )}

      {(asset.status === 'IN_REPAIR' || asset.status === 'RETIRED' || asset.status === 'LOST') && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-xs text-slate-500">Currently {STATUS_LABELS[asset.status].toLowerCase()}.</span>
          <button
            onClick={() => handleQuickStatus('AVAILABLE')}
            disabled={busy}
            className="text-xs text-mitra-accentFrom hover:underline disabled:opacity-50"
          >
            Mark Available again
          </button>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-slate-600 mb-2">Assignment history</h4>
        {!detail ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : detail.assignments && detail.assignments.length > 0 ? (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Assigned</th>
                  <th className="px-3 py-2 font-medium">Condition Out</th>
                  <th className="px-3 py-2 font-medium">Returned</th>
                  <th className="px-3 py-2 font-medium">Condition In</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 text-slate-700">{a.employee?.fullName || holderName(a.employeeId)}</td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(a.assignedAt)}</td>
                    <td className="px-3 py-2 text-slate-500">{CONDITION_LABELS[a.conditionAtAssignment]}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {a.returnedAt ? formatDate(a.returnedAt) : <span className="text-indigo-600">Still out</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{a.conditionAtReturn ? CONDITION_LABELS[a.conditionAtReturn] : '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{a.returnNotes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Never assigned yet.</p>
        )}
      </div>
    </div>
  );
}

export default function AssetManagement() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(EMPTY_ASSET);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getAssets(token), getEmployees(token)])
      .then(([a, e]) => {
        setAssets(a);
        setEmployees(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_ASSET);
    setShowForm(true);
  }

  function startEdit(a: Asset) {
    setEditingId(a.id);
    setForm({
      assetTag: a.assetTag,
      category: a.category,
      name: a.name,
      serialNumber: a.serialNumber || '',
      purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
      notes: a.notes || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        assetTag: form.assetTag.trim(),
        category: form.category,
        name: form.name.trim(),
        serialNumber: form.serialNumber.trim() || undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        await updateAsset(token, editingId, payload as any);
      } else {
        await createAsset(token, payload as any);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_ASSET);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this asset? Only possible if it has never been assigned to anyone.')) return;
    try {
      await deleteAsset(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const visible = assets.filter(
    (a) => (categoryFilter === 'ALL' || a.category === categoryFilter) && (statusFilter === 'ALL' || a.status === statusFilter),
  );
  const byCategory = ASSET_CATEGORIES.map((cat) => ({ category: cat, items: visible.filter((a) => a.category === cat) })).filter(
    (g) => g.items.length > 0,
  );

  const tileCounts: Record<AssetStatus, number> = {
    AVAILABLE: 0,
    ASSIGNED: 0,
    IN_REPAIR: 0,
    RETIRED: 0,
    LOST: 0,
  };
  assets.forEach((a) => {
    tileCounts[a.status] += 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Asset Management</h1>
          <p className="text-sm text-slate-500 mt-1">Laptops, monitors, ID cards, phones, and licenses — who has what, and the full history.</p>
        </div>
        <button
          onClick={() => (showForm ? setShowForm(false) : startAdd())}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATUS_TILE_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
            className={`bg-white border rounded-xl p-4 text-left transition-colors ${
              statusFilter === s ? 'border-mitra-accentTo' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`text-2xl font-semibold ${STATUS_TILE_COLOR[s]}`}>{tileCounts[s]}</div>
            <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">{editingId ? 'Edit Asset' : 'New Asset'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Asset Tag</label>
              <input
                required
                value={form.assetTag}
                onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
                placeholder="e.g. LAP-0042"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as AssetCategory })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name / Model</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dell Latitude 5420"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Serial Number (optional)</label>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Purchase Date (optional)</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Asset'}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="ALL">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {statusFilter !== 'ALL' && (
          <button onClick={() => setStatusFilter('ALL')} className="text-xs text-mitra-accentFrom hover:underline">
            Clear status filter ({STATUS_LABELS[statusFilter as AssetStatus]})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : byCategory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          No assets match this filter yet.
        </div>
      ) : (
        byCategory.map(({ category, items }) => {
          const theme = CATEGORY_THEME[category];
          const Icon = CATEGORY_ICONS[category];
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.chip}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className={`text-sm font-semibold ${theme.text}`}>{CATEGORY_LABELS[category]}</h3>
                <span className="text-xs text-slate-400">({items.length})</span>
              </div>
              <div className={`rounded-xl border ${theme.border} ${theme.bg} p-2 mb-6`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200/70">
                        <th className="px-3 py-2 font-medium">Tag</th>
                        <th className="px-3 py-2 font-medium">Name / Model</th>
                        <th className="px-3 py-2 font-medium">Serial</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Currently With</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {items.map((a) => {
                        const holder = a.assignments && a.assignments[0];
                        return (
                          <>
                            <tr
                              key={a.id}
                              className="hover:bg-white/60 cursor-pointer bg-white/40"
                              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                            >
                              <td className="px-3 py-2 font-medium text-slate-700">{a.assetTag}</td>
                              <td className="px-3 py-2 text-slate-600">{a.name}</td>
                              <td className="px-3 py-2 text-slate-500">{a.serialNumber || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[a.status]}`}>
                                  {STATUS_LABELS[a.status]}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">{holder?.employee?.fullName || '—'}</td>
                              <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-3">
                                  <button onClick={() => startEdit(a)} className="text-xs text-slate-500 hover:text-mitra-accentFrom">
                                    Edit
                                  </button>
                                  <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedId === a.id && (
                              <tr>
                                <td colSpan={6} className="p-0">
                                  <AssetDetail asset={a} employees={employees} onChanged={load} />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
