import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import TechStackPicker from '../../components/TechStackPicker';
import { RingAvatar } from '../../components/Avatar';
import { CATEGORY_STYLES, TECH_PILL_FALLBACK } from '../../lib/projectOptions';
import { CATEGORY_LABELS } from '../../components/TechnologyManager';
import {
  addProjectAssignment,
  deleteProject,
  endProject,
  getEmployees,
  getProject,
  getTechnologies,
  removeProjectAssignment,
  updateProject,
  updateProjectAssignment,
} from '../../lib/api';
import { ContractType, Employee, Project, ProjectCategory, ProjectStatus, Technology } from '../../types';

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
};

const CONTRACT_LABELS: Record<ContractType, string> = {
  T_AND_M: 'Time & Materials',
  FIXED_PRICE: 'Fixed Price',
  RETAINER: 'Retainer',
  MANAGED_SERVICE: 'Managed Service',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ProjectCategory[];

// A human-friendly "X months, Y days" span between two dates. Kept local
// for now — the reporting feature can lift this into a shared helper once
// it needs the same duration math across many projects.
function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) return '—';
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  return parts.join(', ');
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    status: 'ACTIVE' as ProjectStatus,
    contractType: '' as ContractType | '',
    category: '' as ProjectCategory | '',
    technologyIds: [] as string[],
    primaryMentorId: '',
    secondaryMentorId: '',
    description: '',
    targetCompletionDate: '',
  });

  const [assignForm, setAssignForm] = useState({ employeeId: '', roleOnProject: '', allocationPercent: '100', mentorRole: '' as '' | 'NONE' | 'PRIMARY' | 'SECONDARY' });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [showEnd, setShowEnd] = useState(false);
  const [endForm, setEndForm] = useState({ endDate: new Date().toISOString().slice(0, 10), closureSummary: '' });
  const [endSubmitting, setEndSubmitting] = useState(false);

  function load() {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([getProject(token, id), getEmployees(token), getTechnologies(token)])
      .then(([p, e, t]) => {
        setProject(p);
        setEmployees(e);
        setTechnologies(t.filter((x) => x.active));
        setInfoForm({
          status: p.status,
          contractType: (p.contractType as ContractType) || '',
          category: (p.category as ProjectCategory) || '',
          technologyIds: (p.technologies?.length ? p.technologies : p.technology ? [p.technology] : []).map((t) => t.id),
          primaryMentorId: p.primaryMentorId || '',
          secondaryMentorId: p.secondaryMentorId || '',
          description: p.description || '',
          targetCompletionDate: p.targetCompletionDate?.slice(0, 10) || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token, id]);

  async function handleSaveInfo() {
    if (!token || !project) return;
    setError('');
    try {
      await updateProject(token, project.id, {
        name: project.name,
        clientId: project.clientId,
        status: infoForm.status,
        contractType: infoForm.contractType || undefined,
        category: infoForm.category || undefined,
        technologyIds: infoForm.technologyIds,
        primaryMentorId: infoForm.primaryMentorId || undefined,
        secondaryMentorId: infoForm.secondaryMentorId || undefined,
        description: infoForm.description || undefined,
        targetCompletionDate: infoForm.targetCompletionDate || undefined,
      } as any);
      setEditingInfo(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteProject() {
    if (!token || !project) return;
    if (!confirm(`Delete project "${project.name}"? This also removes its team assignments.`)) return;
    try {
      await deleteProject(token, project.id);
      navigate('/projects');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleEndProject(e: FormEvent) {
    e.preventDefault();
    if (!token || !project) return;
    setError('');
    setEndSubmitting(true);
    try {
      await endProject(token, project.id, {
        endDate: endForm.endDate || undefined,
        closureSummary: endForm.closureSummary,
      });
      setShowEnd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEndSubmitting(false);
    }
  }

  async function handleAddAssignment(e: FormEvent) {
    e.preventDefault();
    // Leadership Role has no pre-selected default anymore on purpose — it
    // used to silently default to "Team Member", which is exactly how
    // people who were actually meant to be Primary/Secondary mentors kept
    // ending up untagged (the picker looked already-filled-in, so it never
    // got a second look). Now the choice has to be made every time.
    if (!token || !project || !assignForm.employeeId || !assignForm.mentorRole) return;
    setError('');
    setAssignSubmitting(true);
    try {
      await addProjectAssignment(token, project.id, {
        employeeId: assignForm.employeeId,
        roleOnProject: assignForm.roleOnProject || undefined,
        allocationPercent: Number(assignForm.allocationPercent) || 100,
        mentorRole: assignForm.mentorRole === 'NONE' ? undefined : assignForm.mentorRole,
      });
      setAssignForm({ employeeId: '', roleOnProject: '', allocationPercent: '100', mentorRole: '' });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handleEndAssignment(assignmentId: string) {
    if (!token || !project) return;
    if (!confirm('End this assignment as of today?')) return;
    try {
      await updateProjectAssignment(token, project.id, assignmentId, { endDate: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!token || !project) return;
    if (!confirm('Remove this assignment entirely?')) return;
    try {
      await removeProjectAssignment(token, project.id, assignmentId);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;
  if (!project) return <p className="text-slate-500 text-sm">Project not found.</p>;

  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.fullName }));
  const active = project.assignments?.filter((a) => !a.endDate) || [];
  const past = project.assignments?.filter((a) => !!a.endDate) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">{project.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{(project.client as any)?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {project.status !== 'COMPLETED' && project.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowEnd((v) => !v)}
              className="rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700"
            >
              {showEnd ? 'Cancel' : 'End Project'}
            </button>
          )}
          <button onClick={handleDeleteProject} className="text-red-500 hover:text-red-700 text-sm">
            Delete Project
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showEnd && (
        <form onSubmit={handleEndProject} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">End This Project</h2>
            <p className="text-xs text-slate-500 mt-1">
              This marks the project as ended (status becomes Completed) and closes out any active team
              assignments as of the end date. It also stays listed here for the record.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endForm.endDate}
                onChange={(e) => setEndForm({ ...endForm, endDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">
                Closing Summary <span className="text-slate-400">(what this project was about, and how it went)</span>
              </label>
              <textarea
                required
                minLength={1}
                rows={3}
                value={endForm.closureSummary}
                onChange={(e) => setEndForm({ ...endForm, closureSummary: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={endSubmitting || !endForm.closureSummary}
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            {endSubmitting ? 'Ending...' : 'Confirm End Project'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Overview</h2>
          {!editingInfo ? (
            <button onClick={() => setEditingInfo(true)} className="text-mitra-accentFrom text-xs">
              Edit
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={handleSaveInfo} className="text-mitra-accentFrom text-xs font-medium">
                Save
              </button>
              <button onClick={() => setEditingInfo(false)} className="text-slate-400 text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
        {editingInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select
                value={infoForm.status}
                onChange={(e) => setInfoForm({ ...infoForm, status: e.target.value as ProjectStatus })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Category</label>
              <select
                value={infoForm.category}
                onChange={(e) => setInfoForm({ ...infoForm, category: e.target.value as ProjectCategory | '' })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1.5">Tools & Technologies</label>
              <TechStackPicker
                technologies={technologies}
                category={infoForm.category}
                selectedIds={infoForm.technologyIds}
                onToggle={(id) =>
                  setInfoForm({
                    ...infoForm,
                    technologyIds: infoForm.technologyIds.includes(id)
                      ? infoForm.technologyIds.filter((t) => t !== id)
                      : [...infoForm.technologyIds, id],
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contract Type</label>
              <select
                value={infoForm.contractType}
                onChange={(e) => setInfoForm({ ...infoForm, contractType: e.target.value as ContractType | '' })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              <label className="block text-xs text-slate-500 mb-1">Primary Leadership & Team</label>
              <SearchableSelect
                options={employeeOptions}
                value={infoForm.primaryMentorId}
                onChange={(v) => setInfoForm({ ...infoForm, primaryMentorId: v })}
                placeholder="Search employee..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Secondary Leadership & Team</label>
              <SearchableSelect
                options={employeeOptions}
                value={infoForm.secondaryMentorId}
                onChange={(v) => setInfoForm({ ...infoForm, secondaryMentorId: v })}
                placeholder="Search employee..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Target Completion Date</label>
              <input
                type="date"
                value={infoForm.targetCompletionDate}
                onChange={(e) => setInfoForm({ ...infoForm, targetCompletionDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">Description</label>
              <textarea
                rows={2}
                value={infoForm.description}
                onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[project.status]}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="mt-1 text-slate-700">{project.category ? CATEGORY_LABELS[project.category] : '—'}</p>
            </div>
            <div className="col-span-full md:col-span-2">
              <p className="text-xs text-slate-500 mb-1">Tools & Technologies</p>
              {(() => {
                const tools = project.technologies?.length ? project.technologies : project.technology ? [project.technology] : [];
                return tools.length === 0 ? (
                  <p className="text-slate-700">—</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tools.map((t) => (
                      <span key={t.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[t.category]?.pill || TECH_PILL_FALLBACK}`}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <p className="text-xs text-slate-500">Contract Type</p>
              <p className="mt-1 text-slate-700">{project.contractType ? CONTRACT_LABELS[project.contractType] : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Primary Leadership & Team</p>
              {project.primaryMentor ? (
                <div className="flex items-center gap-2 mt-1">
                  <RingAvatar name={project.primaryMentor.fullName} photoUrl={project.primaryMentor.photoUrl} ring="sky" />
                  <p className="text-slate-700">{project.primaryMentor.fullName}</p>
                </div>
              ) : (
                <p className="mt-1 text-slate-700">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Secondary Leadership & Team</p>
              {project.secondaryMentor ? (
                <div className="flex items-center gap-2 mt-1">
                  <RingAvatar name={project.secondaryMentor.fullName} photoUrl={project.secondaryMentor.photoUrl} ring="violet" />
                  <p className="text-slate-700">{project.secondaryMentor.fullName}</p>
                </div>
              ) : (
                <p className="mt-1 text-slate-700">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Start Date</p>
              <p className="mt-1 text-slate-700">{project.startDate?.slice(0, 10) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Target Completion Date</p>
              <p className="mt-1 text-slate-700">{project.targetCompletionDate?.slice(0, 10) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">End Date</p>
              <p className="mt-1 text-slate-700">{project.endDate?.slice(0, 10) || '—'}</p>
            </div>
            {project.description && (
              <div className="col-span-full">
                <p className="text-xs text-slate-500">Description</p>
                <p className="mt-1 text-slate-700">{project.description}</p>
              </div>
            )}
            {project.status === 'COMPLETED' && project.closureSummary && (
              <div className="col-span-full bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Closed</p>
                  {project.startDate && project.endDate && (
                    <p className="text-xs text-slate-500">
                      Duration: <span className="font-medium text-slate-700">{formatDuration(project.startDate, project.endDate)}</span>
                    </p>
                  )}
                </div>
                <p className="mt-2 text-slate-700 text-sm">{project.closureSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Add Mentors</h2>
        <p className="text-xs text-slate-500 mb-4">
          The people actually supporting this client and project — add them here with a role and allocation, and
          tag whoever leads it as Primary or Secondary. Tagging someone here is what makes them the project's
          mentor everywhere else in the app, not just a name on the Overview card.
        </p>
        <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <SearchableSelect
              options={employeeOptions}
              value={assignForm.employeeId}
              onChange={(v) =>
                setAssignForm({
                  ...assignForm,
                  employeeId: v,
                  // Suggest a role when this person is already the project's
                  // picked Leadership — still an explicit, visible, changeable
                  // choice, not a silent auto-tag.
                  mentorRole:
                    v && v === project?.primaryMentorId
                      ? 'PRIMARY'
                      : v && v === project?.secondaryMentorId
                        ? 'SECONDARY'
                        : assignForm.mentorRole,
                })
              }
              placeholder="Search employee..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role on Project</label>
            <input
              value={assignForm.roleOnProject}
              onChange={(e) => setAssignForm({ ...assignForm, roleOnProject: e.target.value })}
              placeholder="e.g. DevOps Engineer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Allocation %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={assignForm.allocationPercent}
              onChange={(e) => setAssignForm({ ...assignForm, allocationPercent: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Leadership Role *</label>
            <select
              value={assignForm.mentorRole}
              onChange={(e) => setAssignForm({ ...assignForm, mentorRole: e.target.value as '' | 'NONE' | 'PRIMARY' | 'SECONDARY' })}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                assignForm.mentorRole ? 'border-slate-300' : 'border-amber-300 bg-amber-50/60'
              }`}
            >
              <option value="" disabled>
                Choose role...
              </option>
              <option value="PRIMARY">Primary Mentor</option>
              <option value="SECONDARY">Secondary Mentor</option>
              <option value="NONE">Team Member (not a mentor)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Leadership on file: Primary — {project.primaryMentor?.fullName || 'none picked'} · Secondary —{' '}
              {project.secondaryMentor?.fullName || 'none picked'}
            </p>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={assignSubmitting || !assignForm.employeeId || !assignForm.mentorRole}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {assignSubmitting ? 'Adding...' : 'Add to Team'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Team ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-slate-500 text-sm">No one assigned yet.</p>
        ) : (
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Allocation</th>
                  <th className="pb-2 font-medium">Since</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        {a.employee.fullName}
                        {a.mentorRole === 'PRIMARY' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700 border border-sky-200">
                            Primary Mentor
                          </span>
                        )}
                        {a.mentorRole === 'SECONDARY' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                            Secondary Mentor
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500">{a.roleOnProject || '—'}</td>
                    <td className="py-2 text-slate-500">{a.allocationPercent}%</td>
                    <td className="py-2 text-slate-500">{a.startDate.slice(0, 10)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => handleEndAssignment(a.id)} className="text-amber-600 hover:text-amber-800 text-xs mr-3">
                        End Assignment
                      </button>
                      <button onClick={() => handleRemoveAssignment(a.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-slate-500 cursor-pointer">Past team members ({past.length})</summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {past.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 text-slate-500">{a.employee.fullName}</td>
                      <td className="py-2 text-slate-400">{a.roleOnProject || '—'}</td>
                      <td className="py-2 text-slate-400">
                        {a.startDate.slice(0, 10)} → {a.endDate?.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
