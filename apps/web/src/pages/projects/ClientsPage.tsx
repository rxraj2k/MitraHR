import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import { CLIENT_REGIONS, CLIENT_REGION_LABELS, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS, getExpiryStatus } from '../../lib/documentCategories';
import {
  US_TIMEZONES,
  US_TIMEZONE_BY_CODE,
  CLIENT_DOMAINS,
  CLIENT_DOMAIN_BY_CODE,
  parseDomains,
  serializeDomains,
} from '../../lib/clientOptions';
import { initials } from '../../components/Avatar';
import MetricTile from '../../components/MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';
import {
  MailIcon,
  PhoneIcon,
  ClockIcon,
  BriefcaseIcon,
  GridIcon,
  AlertTriangleIcon,
  MoreVerticalIcon,
  XIcon,
  BuildingIcon,
} from '../../components/icons';
import {
  createClient,
  createClientContract,
  deleteClient,
  deleteClientContract,
  getClientContracts,
  getClients,
  getContractTypes,
  getProjects,
  openClientContractFile,
  updateClient,
  updateClientContract,
} from '../../lib/api';
import { Client, ClientContract, ClientContractStatus, ClientStatus, LookupItem } from '../../types';

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
  region: string;
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
  region: '',
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
    region: f.region || undefined,
    status: f.status,
    notes: f.notes.trim() || undefined,
  };
}

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

// A distinct color identity per avatar — avatars get color, per house style, never a flat white/slate treatment.
const AVATAR_COLOR_CYCLE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-teal-100 text-teal-700',
];

function ClientAvatar({ name, index }: { name: string; index: number }) {
  const color = AVATAR_COLOR_CYCLE[index % AVATAR_COLOR_CYCLE.length];
  return (
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ${color}`}>
      {initials(name)}
    </div>
  );
}

function ClientRowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left ml-auto">
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
            className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-sm"
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

function toggleDomain(current: string, code: string): string {
  const codes = parseDomains(current);
  const next = codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code];
  return serializeDomains(next);
}

function ClientDrawer({
  mode,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: FormState;
  saving: boolean;
  error: string;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  const activeDomains = parseDomains(form.industry);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">{mode === 'edit' ? 'Edit Client' : 'New Client'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Client Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Client Name</label>
                <input required value={form.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Technical Domain(s)</label>
                <div className="flex flex-wrap gap-2">
                  {CLIENT_DOMAINS.map((d) => {
                    const active = activeDomains.includes(d.code);
                    return (
                      <button
                        type="button"
                        key={d.code}
                        onClick={() => onChange({ industry: toggleDomain(form.industry, d.code) })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active ? d.pill : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {d.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">US Timezone</label>
                  <select value={form.timezone} onChange={(e) => onChange({ timezone: e.target.value })} className={inputClass}>
                    <option value="">Not set</option>
                    {US_TIMEZONES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">US Region</label>
                  <select value={form.region} onChange={(e) => onChange({ region: e.target.value })} className={inputClass}>
                    <option value="">Not set</option>
                    {CLIENT_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {CLIENT_REGION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => onChange({ status: e.target.value as ClientStatus })}
                  className={inputClass}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Primary Point of Contact</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
                <input value={form.contactName} onChange={(e) => onChange({ contactName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Work Email</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => onChange({ contactEmail: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Phone Number</label>
                <input value={form.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Account Notes</h3>
            <textarea
              rows={4}
              placeholder="Account requirements, tech stack details, or project scope notes"
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Client'}
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

function ClientsTab() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Client[]>([]);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<{ mode: 'add' | 'edit'; id?: string; form: FormState } | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    if (!token) return;
    Promise.all([getClients(token), getProjects(token, { status: 'ACTIVE' }), getClientContracts(token)])
      .then(([c, p, ct]) => {
        setItems(c);
        setActiveProjectsCount(p.length);
        setContracts(ct);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function openAdd() {
    setError('');
    setDrawer({ mode: 'add', form: EMPTY });
  }

  function openEdit(item: Client) {
    setError('');
    setDrawer({
      mode: 'edit',
      id: item.id,
      form: {
        name: item.name,
        industry: item.industry || '',
        contactName: item.contactName || '',
        contactEmail: item.contactEmail || '',
        contactPhone: item.contactPhone || '',
        timezone: item.timezone || '',
        region: item.region || '',
        status: item.status,
        notes: item.notes || '',
      },
    });
  }

  function updateDrawerForm(patch: Partial<FormState>) {
    setDrawer((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d));
  }

  async function handleDrawerSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !drawer || !drawer.form.name.trim()) return;
    setError('');
    setSaving(true);
    try {
      if (drawer.mode === 'edit' && drawer.id) {
        await updateClient(token, drawer.id, toPayload(drawer.form));
      } else {
        await createClient(token, toPayload(drawer.form));
      }
      setDrawer(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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

  const activeUsClients = items.filter((c) => c.status === 'ACTIVE' && c.region !== 'NON_US').length;

  const domainCounts = new Map<string, number>();
  items
    .filter((c) => c.status === 'ACTIVE')
    .forEach((c) => {
      parseDomains(c.industry).forEach((code) => domainCounts.set(code, (domainCounts.get(code) || 0) + 1));
    });
  const topDomains = [...domainCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([code]) => CLIENT_DOMAIN_BY_CODE[code]?.shortLabel || code);

  // "Due" mirrors the same 30-day EXPIRING_SOON window Document Management
  // already uses for company documents, plus anything already past its end
  // date and never marked renewed/terminated — reusing that convention
  // rather than inventing a new threshold.
  const renewalsDue = contracts.filter(
    (c) => c.status === 'ACTIVE' && ['EXPIRING_SOON', 'EXPIRED'].includes(getExpiryStatus(c.endDate)),
  ).length;

  const metricTiles: { label: string; value: number; icon: typeof BuildingIcon; sub?: string }[] = [
    { label: 'Active US Clients', value: activeUsClients, icon: BuildingIcon },
    { label: 'Active Projects', value: activeProjectsCount, icon: BriefcaseIcon },
    {
      label: 'Primary Domains',
      value: domainCounts.size,
      icon: GridIcon,
      sub: topDomains.length ? topDomains.join(', ') : 'No domains tagged yet',
    },
    { label: 'Contract Renewals Due', value: renewalsDue, icon: AlertTriangleIcon, sub: 'Within 30 days' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricTiles.map((t, i) => (
          <div key={t.label} className={tileWrapperClass(TILE_THEMES[i % TILE_THEMES.length])}>
            <MetricTile icon={t.icon} label={t.label} value={t.value} sub={t.sub} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={openAdd}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + New Client
        </button>
      </div>

      {error && !drawer && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <BuildingIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No clients yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            const domains = parseDomains(item.industry);
            const tz = item.timezone ? US_TIMEZONE_BY_CODE[item.timezone] : null;
            const projectCount = item._count?.projects ?? 0;
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 min-w-[220px] flex-1">
                  <ClientAvatar name={item.name} index={i} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                          item.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.region && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {CLIENT_REGION_LABELS[item.region as keyof typeof CLIENT_REGION_LABELS] || item.region}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 min-w-[170px]">
                  {domains.length === 0 ? (
                    <span className="text-xs text-slate-300">No domains tagged</span>
                  ) : (
                    domains.map((code) => {
                      const d = CLIENT_DOMAIN_BY_CODE[code];
                      return (
                        <span key={code} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${d?.pill || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {d?.shortLabel || code}
                        </span>
                      );
                    })
                  )}
                </div>

                <div className="min-w-[100px]">
                  {tz ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-100 text-cyan-700 border border-cyan-200">
                      <ClockIcon className="w-3 h-3" /> {tz.shortLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">No timezone</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 min-w-[130px]">
                  {item.contactName && <span className="text-xs text-slate-600 mr-0.5 truncate max-w-[90px]">{item.contactName}</span>}
                  {item.contactEmail && (
                    <a
                      href={`mailto:${item.contactEmail}`}
                      title={item.contactEmail}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-mitra-accentFrom hover:bg-slate-50 flex-shrink-0"
                    >
                      <MailIcon className="w-4 h-4" />
                    </a>
                  )}
                  {item.contactPhone && (
                    <a
                      href={`tel:${item.contactPhone}`}
                      title={item.contactPhone}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-mitra-accentFrom hover:bg-slate-50 flex-shrink-0"
                    >
                      <PhoneIcon className="w-4 h-4" />
                    </a>
                  )}
                  {!item.contactName && !item.contactEmail && !item.contactPhone && (
                    <span className="text-xs text-slate-300">No contact on file</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/projects?clientId=${item.id}`)}
                  title="View allocated projects"
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1 text-xs font-semibold hover:bg-violet-200 transition-colors flex-shrink-0"
                >
                  <BriefcaseIcon className="w-3.5 h-3.5" /> {projectCount} project{projectCount === 1 ? '' : 's'}
                </button>

                <ClientRowMenu onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
              </div>
            );
          })}
        </div>
      )}

      {drawer && (
        <ClientDrawer
          mode={drawer.mode}
          form={drawer.form}
          saving={saving}
          error={error}
          onChange={updateDrawerForm}
          onSubmit={handleDrawerSubmit}
          onClose={() => setDrawer(null)}
        />
      )}
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
  const [contractTypes, setContractTypes] = useState<LookupItem[]>([]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [c, ct, types] = await Promise.all([getClients(token), getClientContracts(token), getContractTypes(token)]);
      setClients(c);
      setContracts(ct);
      setContractTypes(types);
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
              list="contract-types-datalist"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <datalist id="contract-types-datalist">
              {contractTypes.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
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
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
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
                              list="contract-types-datalist"
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
