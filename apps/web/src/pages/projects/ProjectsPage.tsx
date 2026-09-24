import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import TechStackPicker from '../../components/TechStackPicker';
import { Avatar, RingAvatar } from '../../components/Avatar';
import {
  BriefcaseIcon,
  BuildingIcon,
  AlertTriangleIcon,
  GridIcon,
  MoreVerticalIcon,
  UsersIcon,
  XIcon,
} from '../../components/icons';
import { CATEGORY_LABELS } from '../../components/TechnologyManager';
import { CATEGORY_STYLES, STATUS_STYLES, TECH_PILL_FALLBACK } from '../../lib/projectOptions';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';
import { HUE_GRADIENTS, TOGGLE_3D_INACTIVE, toggle3dActive } from '../../lib/buttonStyles';
import MetricTile from '../../components/MetricTile';
import { createProject, deleteProject, getClients, getEmployees, getProjects, getTechnologies, updateProject } from '../../lib/api';
import { Client, ContractType, Employee, Project, ProjectCategory, ProjectStatus, Technology } from '../../types';

const CONTRACT_LABELS: Record<ContractType, string> = {
  T_AND_M: 'Time & Materials',
  FIXED_PRICE: 'Fixed Price',
  RETAINER: 'Retainer',
  MANAGED_SERVICE: 'Managed Service',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProjectCategory[];
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

interface FormState {
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  contractType: ContractType | '';
  category: ProjectCategory | '';
  technologyIds: string[];
  primaryMentorId: string;
  secondaryMentorId: string;
  startDate: string;
  targetCompletionDate: string;
}

const EMPTY: FormState = {
  name: '',
  clientId: '',
  description: '',
  status: 'ACTIVE',
  contractType: '',
  category: '',
  technologyIds: [],
  primaryMentorId: '',
  secondaryMentorId: '',
  startDate: '',
  targetCompletionDate: '',
};

function toPayload(f: FormState) {
  return {
    name: f.name.trim(),
    clientId: f.clientId,
    description: f.description.trim() || undefined,
    status: f.status,
    contractType: f.contractType || undefined,
    category: f.category || undefined,
    technologyIds: f.technologyIds,
    primaryMentorId: f.primaryMentorId || undefined,
    secondaryMentorId: f.secondaryMentorId || undefined,
    startDate: f.startDate || undefined,
    targetCompletionDate: f.targetCompletionDate || undefined,
  };
}

function ProjectRowMenu({ onEdit, onView, onDelete }: { onEdit: () => void; onView: () => void; onDelete: () => void }) {
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
            className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-sm"
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
                onView();
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              View Full Details
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

function ProjectDrawer({
  mode,
  form,
  saving,
  error,
  clientOptions,
  employeeOptions,
  employees,
  technologies,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: FormState;
  saving: boolean;
  error: string;
  clientOptions: { id: string; name: string }[];
  employeeOptions: { id: string; name: string }[];
  employees: Employee[];
  technologies: Technology[];
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  const primaryMentor = employees.find((e) => e.id === form.primaryMentorId);
  const secondaryMentor = employees.find((e) => e.id === form.secondaryMentorId);

  function toggleTech(id: string) {
    const next = form.technologyIds.includes(id) ? form.technologyIds.filter((t) => t !== id) : [...form.technologyIds, id];
    onChange({ technologyIds: next });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">{mode === 'edit' ? 'Edit Project' : 'New Project'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Project Basics</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Project Name</label>
                <input required value={form.name} onChange={(e) => onChange({ name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Client</label>
                <SearchableSelect
                  options={clientOptions}
                  value={form.clientId}
                  onChange={(id) => onChange({ clientId: id })}
                  placeholder="Search client..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contract Type</label>
                  <select
                    value={form.contractType}
                    onChange={(e) => onChange({ contractType: e.target.value as ContractType | '' })}
                    className={inputClass}
                  >
                    <option value="">Not specified</option>
                    {(Object.keys(CONTRACT_LABELS) as ContractType[]).map((c) => (
                      <option key={c} value={c}>
                        {CONTRACT_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => onChange({ status: e.target.value as ProjectStatus })} className={inputClass}>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Tech Stack & Domain</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => onChange({ category: e.target.value as ProjectCategory | '' })}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Tools & Technologies</label>
                <TechStackPicker technologies={technologies} category={form.category} selectedIds={form.technologyIds} onToggle={toggleTech} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Leadership & Team</h3>
            <p className="text-xs text-slate-400 mb-3">
              These are the people actually supporting this client and project. For a new project, the real way to
              add them (with a role and allocation %) is Add Mentors on the project's Full Details page once it's
              created — the pickers below are just a quick display/override.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Primary Leadership & Team</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={employeeOptions}
                      value={form.primaryMentorId}
                      onChange={(id) => onChange({ primaryMentorId: id })}
                      placeholder="Search employee..."
                    />
                  </div>
                  {primaryMentor && <RingAvatar name={primaryMentor.fullName} photoUrl={primaryMentor.photoUrl} ring="sky" />}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Secondary Leadership & Team</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={employeeOptions}
                      value={form.secondaryMentorId}
                      onChange={(id) => onChange({ secondaryMentorId: id })}
                      placeholder="Search employee..."
                    />
                  </div>
                  {secondaryMentor && <RingAvatar name={secondaryMentor.fullName} photoUrl={secondaryMentor.photoUrl} ring="violet" />}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Timeline & Scope</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={form.targetCompletionDate}
                    onChange={(e) => onChange({ targetCompletionDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => onChange({ description: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.clientId}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Project'}
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

function TeamModal({ project, onClose }: { project: Project; onClose: () => void }) {
  // The list fetch already brings every currently-open assignment along
  // with the row (see ProjectsService.findAll) — no separate lazy fetch
  // needed here any more, so this always has the same data the card shows.
  const members = project.assignments || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">{project.name} — Team</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        {members.length === 0 ? (
          <div className="text-center py-6">
            <UsersIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No one assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {members.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                <Avatar name={a.employee.fullName} photoUrl={a.employee.photoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate flex items-center gap-1.5">
                    {a.employee.fullName}
                    {a.mentorRole === 'PRIMARY' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 flex-shrink-0">
                        Primary
                      </span>
                    )}
                    {a.mentorRole === 'SECONDARY' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0">
                        Secondary
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{a.roleOnProject || 'Team Member'}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5 flex-shrink-0">
                  {a.allocationPercent}%
                </span>
              </div>
            ))}
          </div>
        )}
        <Link
          to={`/projects/${project.id}`}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mitra-accentFrom hover:underline"
        >
          Manage team on Full Details →
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [searchParams, setSearchParams] = useSearchParams();
  const clientFilter = searchParams.get('clientId') || '';
  const [drawer, setDrawer] = useState<{ mode: 'add' | 'edit'; id?: string; form: FormState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamModal, setTeamModal] = useState<Project | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getProjects(token), getClients(token), getEmployees(token), getTechnologies(token)])
      .then(([p, c, e, t]) => {
        setProjects(p);
        setClients(c);
        setEmployees(e);
        setTechnologies(t.filter((x) => x.active));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  function openAdd() {
    setError('');
    setDrawer({ mode: 'add', form: EMPTY });
  }

  function openEdit(p: Project) {
    setError('');
    setDrawer({
      mode: 'edit',
      id: p.id,
      form: {
        name: p.name,
        clientId: p.clientId,
        description: p.description || '',
        status: p.status,
        contractType: (p.contractType as ContractType) || '',
        category: (p.category as ProjectCategory) || '',
        technologyIds: (p.technologies?.length ? p.technologies : p.technology ? [p.technology] : []).map((t) => t.id),
        primaryMentorId: p.primaryMentorId || '',
        secondaryMentorId: p.secondaryMentorId || '',
        startDate: p.startDate?.slice(0, 10) || '',
        targetCompletionDate: p.targetCompletionDate?.slice(0, 10) || '',
      },
    });
  }

  function updateDrawerForm(patch: Partial<FormState>) {
    setDrawer((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d));
  }

  async function handleDrawerSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !drawer || !drawer.form.name.trim() || !drawer.form.clientId) return;
    setError('');
    setSaving(true);
    try {
      if (drawer.mode === 'edit' && drawer.id) {
        await updateProject(token, drawer.id, toPayload(drawer.form) as any);
      } else {
        await createProject(token, toPayload(drawer.form) as any);
      }
      setDrawer(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!token) return;
    if (!confirm(`Delete project "${name}"? This also removes its team assignments.`)) return;
    setError('');
    try {
      await deleteProject(token, id);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openTeamModal(p: Project) {
    setTeamModal(p);
  }

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.fullName }));
  const shown = projects.filter(
    (p) => (statusFilter === 'ALL' || p.status === statusFilter) && (!clientFilter || p.client.id === clientFilter),
  );
  const filteredClientName = clientFilter ? clients.find((c) => c.id === clientFilter)?.name : undefined;

  // --- Metrics ---
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
  const allocatedTeamMembers = projects.reduce((sum, p) => sum + (p.assignments?.length ?? 0), 0);
  const categoryCounts = new Map<string, number>();
  activeProjects.forEach((p) => {
    if (p.category) categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
  });
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([c]) => CATEGORY_LABELS[c as ProjectCategory] || c);
  const onHold = projects.filter((p) => p.status === 'ON_HOLD').length;

  // "How many projects are we running per tool" — e.g. how many projects
  // have Okta tagged, how many have SailPoint ISC tagged, etc. Grouped by
  // the actual tagged Technology (not the project's own name or its
  // single Category), so two differently-named projects that both tag the
  // same tool count toward the same bucket, and a project tagging several
  // tools counts once for each of them.
  const toolCounts = new Map<string, { name: string; category: ProjectCategory; count: number }>();
  projects.forEach((p) => {
    const tools = p.technologies?.length ? p.technologies : p.technology ? [p.technology] : [];
    tools.forEach((t) => {
      const existing = toolCounts.get(t.id);
      if (existing) existing.count += 1;
      else toolCounts.set(t.id, { name: t.name, category: t.category, count: 1 });
    });
  });
  const toolBreakdown = [...toolCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const metricTiles: { label: string; value: number; icon: typeof BuildingIcon; sub?: string }[] = [
    { label: 'Active Projects', value: activeProjects.length, icon: BriefcaseIcon },
    { label: 'Allocated Team Members', value: allocatedTeamMembers, icon: UsersIcon },
    {
      label: 'Tech Categories',
      value: categoryCounts.size,
      icon: GridIcon,
      sub: topCategories.length ? topCategories.join(', ') : 'No categories tagged yet',
    },
    { label: 'On-Hold / At Risk', value: onHold, icon: AlertTriangleIcon, sub: 'Projects on hold' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Project Management</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricTiles.map((t, i) => (
          <div key={t.label} className={tileWrapperClass(TILE_THEMES[i % TILE_THEMES.length])}>
            <MetricTile icon={t.icon} label={t.label} value={t.value} sub={t.sub} />
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500 text-white flex-shrink-0">
            <GridIcon className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-700">Projects by Tool</p>
            <p className="text-xs text-slate-400">How many projects have each tool tagged in their Tech Stack</p>
          </div>
        </div>
        {toolBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400">No tools tagged on any project yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {toolBreakdown.map((t) => {
              const style = CATEGORY_STYLES[t.category];
              return (
                <span
                  key={t.name}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${style?.pill || TECH_PILL_FALLBACK}`}
                >
                  {t.name}
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/70 text-[10px] font-semibold">
                    {t.count}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {error && !drawer && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg transition-all duration-150 ${statusFilter === s ? toggle3dActive(HUE_GRADIENTS.slate) : TOGGLE_3D_INACTIVE}`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        {clientFilter && (
          <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-xs font-medium">
            Filtered to: {filteredClientName || 'Client'}
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-violet-200"
              title="Clear client filter"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <BriefcaseIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No projects yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => {
            const tools = p.technologies?.length ? p.technologies : p.technology ? [p.technology] : [];
            const openAssignments = p.assignments || [];
            const leaderCount = openAssignments.filter((a) => a.mentorRole === 'PRIMARY' || a.mentorRole === 'SECONDARY').length;
            const memberCount = openAssignments.length - leaderCount;
            const teamLabel =
              leaderCount > 0 && memberCount > 0
                ? `${leaderCount} Leader${leaderCount === 1 ? '' : 's'} · ${memberCount} Member${memberCount === 1 ? '' : 's'}`
                : leaderCount > 0
                  ? `${leaderCount} Leader${leaderCount === 1 ? '' : 's'}`
                  : `${memberCount} Member${memberCount === 1 ? '' : 's'}`;
            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="min-w-[200px] flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/projects/${p.id}`} className="text-sm font-semibold text-slate-800 hover:text-mitra-accentFrom">
                      {p.name}
                    </Link>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[p.status]}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ clientId: p.client.id })}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
                  >
                    <BuildingIcon className="w-3 h-3" /> {p.client?.name}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-w-[180px] max-w-xs">
                  {p.category && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${CATEGORY_STYLES[p.category].pill}`}>
                      {CATEGORY_LABELS[p.category]}
                    </span>
                  )}
                  {tools.length === 0 ? (
                    !p.category && <span className="text-xs text-slate-300">No tech tagged</span>
                  ) : (
                    tools.map((t) => (
                      <span key={t.id} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${CATEGORY_STYLES[t.category]?.pill || TECH_PILL_FALLBACK}`}>
                        {t.name}
                      </span>
                    ))
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-[180px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Leadership</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-sky-500 w-14 flex-shrink-0">Primary</span>
                      {p.primaryMentor ? (
                        <>
                          <RingAvatar name={p.primaryMentor.fullName} photoUrl={p.primaryMentor.photoUrl} ring="sky" />
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[90px]">{p.primaryMentor.fullName}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">Not assigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-violet-500 w-14 flex-shrink-0">Secondary</span>
                      {p.secondaryMentor ? (
                        <>
                          <RingAvatar name={p.secondaryMentor.fullName} photoUrl={p.secondaryMentor.photoUrl} ring="violet" />
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[90px]">{p.secondaryMentor.fullName}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">Not assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-[180px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mentors (Allocation)</p>
                  <div className="flex flex-col gap-1">
                    {(['PRIMARY', 'SECONDARY'] as const).map((role) => {
                      const tagged = openAssignments.find((a) => a.mentorRole === role);
                      const ring = role === 'PRIMARY' ? 'sky' : 'violet';
                      const tint = role === 'PRIMARY' ? 'text-sky-500' : 'text-violet-500';
                      const pill = role === 'PRIMARY' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700';
                      return (
                        <div key={role} className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold w-14 flex-shrink-0 ${tint}`}>
                            {role === 'PRIMARY' ? 'Primary' : 'Secondary'}
                          </span>
                          {tagged ? (
                            <>
                              <RingAvatar name={tagged.employee.fullName} photoUrl={tagged.employee.photoUrl} ring={ring} />
                              <span className="text-xs text-slate-700 font-medium truncate max-w-[70px]">{tagged.employee.fullName}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${pill}`}>
                                {tagged.allocationPercent}%
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-300">Not assigned</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openTeamModal(p)}
                  title="View team members"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold hover:bg-emerald-200 transition-colors flex-shrink-0"
                >
                  <UsersIcon className="w-3.5 h-3.5" /> {teamLabel}
                </button>

                <ProjectRowMenu
                  onEdit={() => openEdit(p)}
                  onView={() => navigate(`/projects/${p.id}`)}
                  onDelete={() => handleDelete(p.id, p.name)}
                />
              </div>
            );
          })}
        </div>
      )}

      {drawer && (
        <ProjectDrawer
          mode={drawer.mode}
          form={drawer.form}
          saving={saving}
          error={error}
          clientOptions={clientOptions}
          employeeOptions={employeeOptions}
          employees={employees}
          technologies={technologies}
          onChange={updateDrawerForm}
          onSubmit={handleDrawerSubmit}
          onClose={() => setDrawer(null)}
        />
      )}

      {teamModal && <TeamModal project={teamModal} onClose={() => setTeamModal(null)} />}
    </div>
  );
}
