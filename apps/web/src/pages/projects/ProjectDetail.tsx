import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import {
  addProjectAssignment,
  deleteProject,
  getEmployees,
  getProject,
  removeProjectAssignment,
  updateProject,
  updateProjectAssignment,
} from '../../lib/api';
import { ContractType, Employee, Project, ProjectStatus } from '../../types';

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

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    status: 'ACTIVE' as ProjectStatus,
    contractType: '' as ContractType | '',
    description: '',
  });

  const [assignForm, setAssignForm] = useState({ employeeId: '', roleOnProject: '', allocationPercent: '100' });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  function load() {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([getProject(token, id), getEmployees(token)])
      .then(([p, e]) => {
        setProject(p);
        setEmployees(e);
        setInfoForm({ status: p.status, contractType: (p.contractType as ContractType) || '', description: p.description || '' });
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
        description: infoForm.description || undefined,
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

  async function handleAddAssignment(e: FormEvent) {
    e.preventDefault();
    if (!token || !project || !assignForm.employeeId) return;
    setError('');
    setAssignSubmitting(true);
    try {
      await addProjectAssignment(token, project.id, {
        employeeId: assignForm.employeeId,
        roleOnProject: assignForm.roleOnProject || undefined,
        allocationPercent: Number(assignForm.allocationPercent) || 100,
      });
      setAssignForm({ employeeId: '', roleOnProject: '', allocationPercent: '100' });
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
          <p className="text-slate-500 text-sm mt-1">
            {(project.client as any)?.name}
            {project.projectManager && <span> · PM: {project.projectManager.fullName}</span>}
          </p>
        </div>
        <button onClick={handleDeleteProject} className="text-red-500 hover:text-red-700 text-sm">
          Delete Project
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

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
              <p className="text-xs text-slate-500">Contract Type</p>
              <p className="mt-1 text-slate-700">{project.contractType ? CONTRACT_LABELS[project.contractType] : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Start Date</p>
              <p className="mt-1 text-slate-700">{project.startDate?.slice(0, 10) || '—'}</p>
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
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Team Member</h2>
        <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <SearchableSelect
              options={employeeOptions}
              value={assignForm.employeeId}
              onChange={(v) => setAssignForm({ ...assignForm, employeeId: v })}
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
          <div className="flex items-end">
            <button
              type="submit"
              disabled={assignSubmitting || !assignForm.employeeId}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
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
                    <td className="py-2 font-medium text-slate-700">{a.employee.fullName}</td>
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
