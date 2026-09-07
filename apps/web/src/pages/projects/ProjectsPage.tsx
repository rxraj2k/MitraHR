import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../../components/SearchableSelect';
import { createProject, getClients, getEmployees, getProjects } from '../../lib/api';
import { Client, ContractType, Employee, Project, ProjectStatus } from '../../types';

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

export default function ProjectsPage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    description: '',
    status: 'ACTIVE' as ProjectStatus,
    contractType: '' as ContractType | '',
    startDate: '',
    endDate: '',
    projectManagerId: '',
  });

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getProjects(token), getClients(token), getEmployees(token)])
      .then(([p, c, e]) => {
        setProjects(p);
        setClients(c);
        setEmployees(e);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSubmitting(true);
    try {
      await createProject(token, {
        ...form,
        contractType: form.contractType || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        projectManagerId: form.projectManagerId || undefined,
      } as any);
      setForm({
        name: '',
        clientId: '',
        description: '',
        status: 'ACTIVE',
        contractType: '',
        startDate: '',
        endDate: '',
        projectManagerId: '',
      });
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const employeeOptions = employees.map((e) => ({ id: e.id, name: e.fullName }));
  const shown = statusFilter === 'ALL' ? projects : projects.filter((p) => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Project Management</h1>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          {showAdd ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Project Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Client</label>
            <SearchableSelect
              options={clientOptions}
              value={form.clientId}
              onChange={(id) => setForm({ ...form, clientId: id })}
              placeholder="Search client..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Project Manager</label>
            <SearchableSelect
              options={employeeOptions}
              value={form.projectManagerId}
              onChange={(id) => setForm({ ...form, projectManagerId: id })}
              placeholder="Search employee..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
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
              value={form.contractType}
              onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType | '' })}
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
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-500 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={submitting || !form.clientId}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2 text-sm">
        {(['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg ${statusFilter === s ? 'bg-mitra-navy text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-slate-500 text-sm">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Manager</th>
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2">
                      <Link to={`/projects/${p.id}`} className="font-medium text-mitra-accentFrom hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-600">{p.client?.name}</td>
                    <td className="py-2 text-slate-500">{p.projectManager?.fullName || '—'}</td>
                    <td className="py-2 text-slate-500">{p._count?.assignments ?? 0}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[p.status]}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
