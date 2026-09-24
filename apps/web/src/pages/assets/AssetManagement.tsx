import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
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
  API_BASE,
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
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  MoreVerticalIcon,
  PackageIcon,
  SearchIcon,
  ShuffleIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from '../../components/icons';
import { Avatar } from '../../components/Avatar';
import { EmployeePicker } from '../../components/EmployeePicker';
import MetricTile from '../../components/MetricTile';
import { TILE_THEME_BY_NAME, tileWrapperClass } from '../../lib/tileThemes';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';

type Tab = 'inventory' | 'assignments';
const TABS: TabBarItem<Tab>[] = [
  { key: 'inventory', label: 'List of Assets', color: 'teal' },
  { key: 'assignments', label: 'Asset Assignment', color: 'indigo' },
];

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

// Only these make sense for something being handed OUT — a return can
// reasonably be Poor/Damaged, but nobody should be issuing a damaged asset.
const HANDOUT_CONDITIONS = ASSET_CONDITIONS.filter((c) => c === 'NEW' || c === 'GOOD' || c === 'FAIR');

interface AssetForm {
  assetTag: string;
  category: AssetCategory;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseValue: string;
  notes: string;
}
const EMPTY_ASSET: AssetForm = {
  assetTag: '',
  category: 'LAPTOP',
  name: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseValue: '',
  notes: '',
};

const STATUS_TILE_ORDER: AssetStatus[] = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'LOST'];
const STATUS_TILE_THEME: Record<AssetStatus, (typeof TILE_THEME_BY_NAME)[keyof typeof TILE_THEME_BY_NAME]> = {
  AVAILABLE: TILE_THEME_BY_NAME.emerald,
  ASSIGNED: TILE_THEME_BY_NAME.indigo,
  IN_REPAIR: TILE_THEME_BY_NAME.amber,
  RETIRED: TILE_THEME_BY_NAME.slate,
  LOST: TILE_THEME_BY_NAME.rose,
};
const STATUS_TILE_ICON: Record<AssetStatus, (props: { className?: string }) => JSX.Element> = {
  AVAILABLE: CheckCircleIcon,
  ASSIGNED: UsersIcon,
  IN_REPAIR: AlertTriangleIcon,
  RETIRED: PackageIcon,
  LOST: XIcon,
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function formatCurrency(v?: number | null) {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// A muted, dashed-border "nothing here yet" badge — used wherever a field
// is empty, so a gap in the data reads as a nudge to fill it in rather
// than blending into the row as a bare dash.
function EmptyBadge({ label }: { label: string }) {
  return (
    <span className="inline-block text-[11px] font-medium bg-slate-50 text-slate-400 border border-dashed border-slate-200 rounded px-1.5 py-0.5">
      {label}
    </span>
  );
}

// A serial number reads as a code, not prose — monospace + a chip makes a
// table of these scannable at a glance instead of blending into the row.
function SerialBadge({ value }: { value?: string | null }) {
  if (!value) return <EmptyBadge label="Unregistered" />;
  return (
    <span className="inline-block font-mono text-[11px] tracking-tight bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">
      {value}
    </span>
  );
}

// Purchase value, same monospaced treatment as the serial badge so the two
// "hard data" columns read consistently.
function ValueBadge({ value }: { value?: number | null }) {
  if (value === undefined || value === null || Number.isNaN(value)) return <EmptyBadge label="N/A" />;
  return (
    <span className="inline-block font-mono text-[11px] tracking-tight bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">
      {formatCurrency(value)}
    </span>
  );
}

// An asset tag is the thing IT actually reads off a sticker on the device —
// a rounded monospaced pill makes it pop out of the row like a real label.
function TagBadge({ value }: { value: string }) {
  return (
    <span className="inline-block font-mono text-[11px] font-semibold tracking-tight bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2 py-0.5">
      {value}
    </span>
  );
}

// --- Add/Edit Asset drawer — a slide-over side panel, same structural and
// visual pattern as ClientDrawer/ProjectDrawer, so opening the form no
// longer pushes the asset list out of view. ---
function AssetDrawer({
  mode,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: AssetForm;
  saving: boolean;
  error: string;
  onChange: (patch: Partial<AssetForm>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">{mode === 'edit' ? 'Edit Asset' : 'New Asset'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Asset Identification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Asset Tag</label>
                <input
                  required
                  value={form.assetTag}
                  onChange={(e) => onChange({ assetTag: e.target.value })}
                  placeholder="e.g. LAP-0042"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => onChange({ category: e.target.value as AssetCategory })}
                  className={inputClass}
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
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="e.g. Dell Latitude 5420"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Serial Number <span className="text-slate-400 font-normal normal-case">(recommended, not required)</span>
                </label>
                <input
                  value={form.serialNumber}
                  onChange={(e) => onChange({ serialNumber: e.target.value })}
                  placeholder="e.g. SN-884291"
                  className={`${inputClass} font-mono`}
                />
                <p className="text-[11px] text-slate-400 mt-1">Worth filling in — it's what makes hardware traceable later.</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Purchase &amp; Meta</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => onChange({ purchaseDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Purchase Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchaseValue}
                    onChange={(e) => onChange({ purchaseValue: e.target.value })}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Operational Notes</label>
                <textarea
                  rows={3}
                  placeholder="Condition notes, accessories included, warranty info, etc."
                  value={form.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg text-sm font-medium px-4 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Asset'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Overflow menu for a row's less-common actions — same "..." pattern as
// Client Management's row menu, so it means the same thing everywhere.
function AssetRowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      >
        <MoreVerticalIcon className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// A compact employee search popover for row-level "Assign"/"Reassign"
// quick actions — anchored to the trigger button's own screen position
// with `position: fixed`, so it always renders on top of the table
// instead of getting clipped by the table's own horizontal scroll area.
function QuickEmployeePopover({
  anchor,
  employees,
  label,
  onSelect,
  onClose,
}: {
  anchor: { top: number; left: number; bottom: number; right: number };
  employees: Employee[];
  label: string;
  onSelect: (employeeId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? employees.filter((e) => e.fullName.toLowerCase().includes(q)) : employees;
    return pool.slice(0, 6);
  }, [employees, query]);

  const width = 256;
  const left = typeof window === 'undefined' ? anchor.left : Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8);
  const top = typeof window === 'undefined' ? anchor.bottom + 6 : Math.min(anchor.bottom + 6, window.innerHeight - 260);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2" style={{ top, left }} onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-1 pb-1.5">{label}</p>
        <div className="relative mb-1.5">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees..."
            className="w-full rounded-md border border-slate-200 pl-7 pr-2 py-1.5 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-1.5">No matches.</p>
          ) : (
            matches.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelect(e.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left"
              >
                <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                <span className="text-xs text-slate-700 truncate">{e.fullName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// --- List of Assets tab: the inventory itself (add, edit, delete, browse
// by category) — no assignment actions here, just what the company owns
// and its current status. ---
function InventoryTab({
  assets,
  employees,
  loading,
  onChanged,
  statusFilter,
  onStatusFilterChange,
}: {
  assets: Asset[];
  employees: Employee[];
  loading: boolean;
  onChanged: () => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
}) {
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [drawer, setDrawer] = useState<{ mode: 'add' | 'edit'; id?: string; form: AssetForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  const [quickMenu, setQuickMenu] = useState<{
    assetId: string;
    mode: 'assign' | 'reassign';
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function startAdd() {
    setError('');
    setDrawer({ mode: 'add', form: EMPTY_ASSET });
  }

  function startEdit(a: Asset) {
    setError('');
    setDrawer({
      mode: 'edit',
      id: a.id,
      form: {
        assetTag: a.assetTag,
        category: a.category,
        name: a.name,
        serialNumber: a.serialNumber || '',
        purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
        purchaseValue: a.purchaseValue !== undefined && a.purchaseValue !== null ? String(a.purchaseValue) : '',
        notes: a.notes || '',
      },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !drawer) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        assetTag: drawer.form.assetTag.trim(),
        category: drawer.form.category,
        name: drawer.form.name.trim(),
        serialNumber: drawer.form.serialNumber.trim() || undefined,
        purchaseDate: drawer.form.purchaseDate || undefined,
        purchaseValue: drawer.form.purchaseValue.trim() ? Number(drawer.form.purchaseValue) : undefined,
        notes: drawer.form.notes.trim() || undefined,
      };
      if (drawer.mode === 'edit' && drawer.id) {
        await updateAsset(token, drawer.id, payload as any);
      } else {
        await createAsset(token, payload as any);
      }
      setDrawer(null);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this asset? Only possible if it has never been assigned to anyone.')) return;
    try {
      await deleteAsset(token, id);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleMarkAvailable(id: string) {
    if (!token) return;
    setBusyId(id);
    setError('');
    try {
      await setAssetStatus(token, id, 'AVAILABLE');
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // One-click return, straight from the main table — condition Good, back
  // into circulation. The detailed AssignmentHistory panel on the
  // Assignment tab still exists for a non-default condition or a note.
  async function handleQuickReturn(id: string) {
    if (!token) return;
    setQuickBusyId(id);
    setError('');
    try {
      await returnAsset(token, id, { conditionAtReturn: 'GOOD', resultingStatus: 'AVAILABLE' });
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuickBusyId(null);
    }
  }

  // Sends an asset to repair — returning it first if it's currently out.
  async function handleQuickRepair(id: string, currentlyAssigned: boolean) {
    if (!token) return;
    setQuickBusyId(id);
    setError('');
    try {
      if (currentlyAssigned) {
        await returnAsset(token, id, { conditionAtReturn: 'FAIR', resultingStatus: 'IN_REPAIR' });
      } else {
        await setAssetStatus(token, id, 'IN_REPAIR');
      }
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuickBusyId(null);
    }
  }

  async function handleQuickAssign(id: string, employeeId: string) {
    if (!token) return;
    setQuickMenu(null);
    setQuickBusyId(id);
    setError('');
    try {
      await assignAsset(token, id, { employeeId, conditionAtAssignment: 'GOOD' });
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuickBusyId(null);
    }
  }

  // Return-then-assign in one flow, so handing an asset to a different
  // person doesn't require a trip through the Assignment tab.
  async function handleQuickReassign(id: string, employeeId: string) {
    if (!token) return;
    setQuickMenu(null);
    setQuickBusyId(id);
    setError('');
    try {
      await returnAsset(token, id, { conditionAtReturn: 'GOOD', resultingStatus: 'AVAILABLE' });
      await assignAsset(token, id, { employeeId, conditionAtAssignment: 'GOOD' });
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuickBusyId(null);
    }
  }

  const searchQuery = search.trim().toLowerCase();
  const visible = assets.filter((a) => {
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const holder = a.assignments && a.assignments[0];
    return (
      a.assetTag.toLowerCase().includes(searchQuery) ||
      a.name.toLowerCase().includes(searchQuery) ||
      (a.serialNumber || '').toLowerCase().includes(searchQuery) ||
      (holder?.employee?.fullName || '').toLowerCase().includes(searchQuery)
    );
  });
  const byCategory = ASSET_CATEGORIES.map((cat) => ({ category: cat, items: visible.filter((a) => a.category === cat) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Everything the company owns — add new assets and manage what's already on the books.</p>
        <button type="button" onClick={startAdd} className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
          + Add Asset
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {drawer && (
        <AssetDrawer
          mode={drawer.mode}
          form={drawer.form}
          saving={saving}
          error={error}
          onChange={(patch) => setDrawer((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d))}
          onSubmit={handleSubmit}
          onClose={() => setDrawer(null)}
        />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag, model, serial, or employee..."
            className={`${inputClass} pl-9`}
          />
        </div>
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
          <button
            type="button"
            onClick={() => onStatusFilterChange('ALL')}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full pl-3 pr-2 py-1.5 hover:bg-indigo-100"
          >
            Status: {STATUS_LABELS[statusFilter as AssetStatus]}
            <XIcon className="w-3 h-3" />
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
          const collapsed = collapsedCategories.has(category);
          return (
            <div key={category}>
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 mb-3 text-left"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.chip}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className={`text-sm font-semibold ${theme.text}`}>{CATEGORY_LABELS[category]}</h3>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${theme.chip}`}>{items.length}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`}
                />
              </button>
              {!collapsed && (
              <div className={`rounded-xl border ${theme.border} ${theme.bg} p-2 mb-6`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200/70">
                        <th className="px-3 py-2 font-medium">Tag</th>
                        <th className="px-3 py-2 font-medium">Name / Model</th>
                        <th className="px-3 py-2 font-medium">Serial</th>
                        <th className="px-3 py-2 font-medium">Value</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Currently With</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {items.map((a) => {
                        const holder = a.assignments && a.assignments[0];
                        const isQuickBusy = quickBusyId === a.id;
                        return (
                          <tr key={a.id} className="bg-white/40 group">
                            <td className="px-3 py-2">
                              <TagBadge value={a.assetTag} />
                            </td>
                            <td className="px-3 py-2 text-slate-600">{a.name}</td>
                            <td className="px-3 py-2">
                              <SerialBadge value={a.serialNumber} />
                            </td>
                            <td className="px-3 py-2">
                              <ValueBadge value={a.purchaseValue} />
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[a.status]}`}>
                                {STATUS_LABELS[a.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {holder?.employee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar name={holder.employee.fullName} photoUrl={holder.employee.photoUrl} size="sm" />
                                  <span className="truncate">{holder.employee.fullName}</span>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {a.status === 'ASSIGNED' && (
                                  <>
                                    <button
                                      onClick={() => handleQuickReturn(a.id)}
                                      disabled={isQuickBusy}
                                      title="Return this asset (condition: Good)"
                                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-md px-2 py-1 shadow-sm disabled:opacity-50"
                                    >
                                      <UserMinusIcon className="w-3.5 h-3.5" />
                                      Return
                                    </button>
                                    <button
                                      onClick={() => handleQuickRepair(a.id, true)}
                                      disabled={isQuickBusy}
                                      title="Return and send to repair"
                                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md px-2 py-1 disabled:opacity-50"
                                    >
                                      <AlertTriangleIcon className="w-3.5 h-3.5" />
                                      Repair
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isQuickBusy}
                                      onClick={(e) =>
                                        setQuickMenu(
                                          quickMenu?.assetId === a.id
                                            ? null
                                            : { assetId: a.id, mode: 'reassign', rect: e.currentTarget.getBoundingClientRect() },
                                        )
                                      }
                                      title="Reassign to someone else"
                                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md px-2 py-1 disabled:opacity-50"
                                    >
                                      <ShuffleIcon className="w-3.5 h-3.5" />
                                      Reassign
                                    </button>
                                  </>
                                )}
                                {a.status === 'AVAILABLE' && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isQuickBusy}
                                      onClick={(e) =>
                                        setQuickMenu(
                                          quickMenu?.assetId === a.id
                                            ? null
                                            : { assetId: a.id, mode: 'assign', rect: e.currentTarget.getBoundingClientRect() },
                                        )
                                      }
                                      title="Assign to an employee"
                                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md px-2 py-1 disabled:opacity-50"
                                    >
                                      <UserPlusIcon className="w-3.5 h-3.5" />
                                      Assign
                                    </button>
                                    <button
                                      onClick={() => handleQuickRepair(a.id, false)}
                                      disabled={isQuickBusy}
                                      title="Send to repair"
                                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md px-2 py-1 disabled:opacity-50"
                                    >
                                      <AlertTriangleIcon className="w-3.5 h-3.5" />
                                      Repair
                                    </button>
                                  </>
                                )}
                                {(a.status === 'IN_REPAIR' || a.status === 'RETIRED' || a.status === 'LOST') && (
                                  <button
                                    onClick={() => handleMarkAvailable(a.id)}
                                    disabled={busyId === a.id}
                                    title="Mark Available"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md px-2 py-1 disabled:opacity-50"
                                  >
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    {busyId === a.id ? '...' : 'Available'}
                                  </button>
                                )}
                                <AssetRowMenu onEdit={() => startEdit(a)} onDelete={() => handleDelete(a.id)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          );
        })
      )}

      {quickMenu && (
        <QuickEmployeePopover
          anchor={quickMenu.rect}
          employees={employees}
          label={quickMenu.mode === 'reassign' ? 'Reassign to' : 'Assign to'}
          onClose={() => setQuickMenu(null)}
          onSelect={(employeeId) =>
            quickMenu.mode === 'reassign' ? handleQuickReassign(quickMenu.assetId, employeeId) : handleQuickAssign(quickMenu.assetId, employeeId)
          }
        />
      )}
    </div>
  );
}

// The expanded row for one currently-assigned asset: a detailed Return
// form plus its full history — kept for when someone needs the full
// control (a non-default condition, a note, sending it to repair instead
// of back into circulation). The quick "Return" button on the Who Has
// What card covers the common case without opening this.
function AssignmentHistory({ asset, onChanged }: { asset: Asset; onChanged: () => void }) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="px-4 py-4 bg-slate-50 space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}

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
            className={`rounded-lg text-sm font-medium px-4 py-1.5 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
          >
            Mark Returned
          </button>
        </div>
      </form>

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
                    <td className="px-3 py-2 text-slate-700">{a.employee?.fullName || '—'}</td>
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
          <p className="text-slate-500 text-sm">No history yet.</p>
        )}
      </div>
    </div>
  );
}

// --- Asset Assignment tab: who has what, right now — plus assigning an
// available asset and returning one in a single click. ---
function AssignmentsTab({
  assets,
  employees,
  loading,
  onChanged,
}: {
  assets: Asset[];
  employees: Employee[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const [pickAssetId, setPickAssetId] = useState('');
  const [pickEmployeeId, setPickEmployeeId] = useState('');
  const [pickCondition, setPickCondition] = useState('GOOD');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [quickReturnBusyId, setQuickReturnBusyId] = useState<string | null>(null);
  const { token } = useAuth();

  const available = assets.filter((a) => a.status === 'AVAILABLE');
  const assigned = assets.filter((a) => a.status === 'ASSIGNED');

  type EmployeeGroup = {
    employeeId: string;
    employeeName: string;
    department?: string | null;
    designation?: string | null;
    photoUrl?: string | null;
    assets: Asset[];
  };

  const byEmployee: EmployeeGroup[] = [];
  {
    const map = new Map<string, EmployeeGroup>();
    for (const a of assigned) {
      const holder = a.assignments && a.assignments[0];
      const employeeId = holder?.employeeId || holder?.employee?.id || 'unknown';
      const fullEmployee = employees.find((e) => e.id === employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, {
          employeeId,
          employeeName: fullEmployee?.fullName || holder?.employee?.fullName || 'Unknown',
          department: fullEmployee?.department?.name,
          designation: fullEmployee?.designation?.name,
          photoUrl: fullEmployee?.photoUrl || holder?.employee?.photoUrl,
          assets: [],
        });
      }
      map.get(employeeId)!.assets.push(a);
    }
    byEmployee.push(...Array.from(map.values()).sort((x, y) => x.employeeName.localeCompare(y.employeeName)));
  }

  async function handleAssignOne(e: FormEvent) {
    e.preventDefault();
    if (!token || !pickAssetId || !pickEmployeeId) return;
    setAssigning(true);
    setAssignMessage('');
    try {
      await assignAsset(token, pickAssetId, { employeeId: pickEmployeeId, conditionAtAssignment: pickCondition });
      setAssignMessage('Assigned.');
      setPickAssetId('');
      setPickEmployeeId('');
      onChanged();
    } catch (err: any) {
      setAssignMessage(err.message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleQuickReturn(assetId: string) {
    if (!token) return;
    setQuickReturnBusyId(assetId);
    setAssignMessage('');
    try {
      await returnAsset(token, assetId, { conditionAtReturn: 'GOOD', resultingStatus: 'AVAILABLE' });
      onChanged();
    } catch (err: any) {
      setAssignMessage(err.message);
    } finally {
      setQuickReturnBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-indigo-50 via-white to-white shadow-[0_16px_36px_-18px_rgba(79,70,229,0.35)] p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Assign an Asset</h2>
        <p className="text-xs text-slate-500 mb-5">Hand an available asset to an employee. Only assets not currently out show up here.</p>
        {assignMessage && <div className="text-sm text-slate-600 mb-3">{assignMessage}</div>}
        <form onSubmit={handleAssignOne} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Available Asset</label>
              <select
                required
                value={pickAssetId}
                onChange={(e) => setPickAssetId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select an available asset...</option>
                {available.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetTag} · {a.name} ({CATEGORY_LABELS[a.category]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Condition Handed Out</label>
              <select value={pickCondition} onChange={(e) => setPickCondition(e.target.value)} className={inputClass}>
                {HANDOUT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <EmployeePicker employees={employees} value={pickEmployeeId} onChange={setPickEmployeeId} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={assigning || !pickAssetId || !pickEmployeeId}
              className={`rounded-lg text-sm font-medium px-5 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
            >
              {assigning ? 'Assigning...' : 'Assign Asset'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Who Has What</h2>
        <p className="text-xs text-slate-500 mb-5">
          Grouped by employee — expand a card to see exactly what they're holding, and return an item in one click.
        </p>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : byEmployee.length === 0 ? (
          <p className="text-slate-500 text-sm">Nothing currently checked out.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byEmployee.map((group) => {
              const isOpen = expandedEmployeeId === group.employeeId;
              return (
                <div
                  key={group.employeeId}
                  className={`rounded-xl border transition-all duration-150 ${
                    isOpen ? 'border-indigo-200 shadow-md' : 'border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedEmployeeId(isOpen ? null : group.employeeId);
                      setExpandedAssetId(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={group.employeeName} photoUrl={group.photoUrl} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{group.employeeName}</div>
                        {(group.designation || group.department) && (
                          <div className="text-xs text-slate-500 truncate">
                            {[group.designation, group.department].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 font-medium">
                        {group.assets.length} asset{group.assets.length === 1 ? '' : 's'}
                      </span>
                      <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                      {group.assets.map((a) => {
                        const holder = a.assignments && a.assignments[0];
                        const assetOpen = expandedAssetId === a.id;
                        const Icon = CATEGORY_ICONS[a.category];
                        const busy = quickReturnBusyId === a.id;
                        return (
                          <div key={a.id} className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/60">
                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm text-slate-700 truncate">{a.name}</div>
                                  <div className="text-xs text-slate-500 truncate">
                                    {a.assetTag} · {CATEGORY_LABELS[a.category]}
                                    {holder ? ` · since ${formatDate(holder.assignedAt)}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuickReturn(a.id)}
                                  disabled={busy}
                                  title="Return this asset now (condition: Good)"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-md px-2.5 py-1.5 shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 disabled:opacity-50"
                                >
                                  <UserMinusIcon className="w-3.5 h-3.5" />
                                  {busy ? 'Returning...' : 'Return'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedAssetId(assetOpen ? null : a.id)}
                                  className="text-xs text-mitra-accentFrom hover:underline"
                                >
                                  {assetOpen ? 'Hide' : 'History'}
                                </button>
                              </div>
                            </div>
                            {assetOpen && <AssignmentHistory asset={a} onChanged={onChanged} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
  const [tab, setTab] = useState<Tab>('inventory');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getAssets(token), getEmployees(token)])
      .then(([a, e]) => {
        setAssets(a);
        setEmployees(e);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

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

  function handleTileClick(s: AssetStatus) {
    setStatusFilter((current) => (current === s ? 'ALL' : s));
    setTab('inventory');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Asset Management</h1>
        <p className="text-sm text-slate-500 mt-1">Laptops, monitors, ID cards, phones, and licenses — what the company owns, and who has it.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATUS_TILE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleTileClick(s)}
            title="Click to filter the list below by this status"
            className={`relative overflow-hidden ${tileWrapperClass(STATUS_TILE_THEME[s], { active: statusFilter === s })}`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent" />
            <div className="relative">
              <MetricTile icon={STATUS_TILE_ICON[s]} label={STATUS_LABELS[s]} value={tileCounts[s]} />
            </div>
          </button>
        ))}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'inventory' && (
        <InventoryTab
          assets={assets}
          employees={employees}
          loading={loading}
          onChanged={load}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}
      {tab === 'assignments' && <AssignmentsTab assets={assets} employees={employees} loading={loading} onChanged={load} />}
    </div>
  );
}
