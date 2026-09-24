// Talent Directory (Sprint 19) — formerly a flat "Employees" spreadsheet
// table. Row/card click now opens a read-only TalentProfileDrawer instead
// of navigating straight into the edit form (see EmployeeDetail.tsx, which
// is still exactly where staff land from "Edit full profile" in the drawer
// or "Update Skills" in the quick-actions menu below).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, getAttendanceCalendar, getDepartments, getEmployees } from '../../lib/api';
import { Employee } from '../../types';
import {
  DEPLOYMENT_STATUSES,
  DEPLOYMENT_STATUS_BADGE,
  DEPLOYMENT_STATUS_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  getClientAllocation,
  getTopSkills,
} from '../../lib/talentDirectory';
import { CheckCircleIcon, ClockIcon, GridIcon, MoreVerticalIcon, SearchIcon, UsersIcon } from '../../components/icons';
import MetricTile from '../../components/MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';
import TalentProfileDrawer from './TalentProfileDrawer';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contractor',
};

type ViewMode = 'table' | 'cards';

// Skill-chip colors cycle through a small fixed palette by index, not by
// hashing the skill name — keeps them visually calm rather than random.
const CHIP_COLORS = [
  'bg-sky-50 text-sky-700 border-sky-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-orange-50 text-orange-700 border-orange-200',
];

function TechChips({ employee }: { employee: Employee }) {
  const skills = getTopSkills(employee, 3);
  if (skills.length === 0) return <span className="text-xs text-slate-400">No skills logged</span>;
  const extra = (employee.skills?.length || 0) - skills.length;
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s, i) => (
        <span
          key={s.name}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
        >
          {s.name}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-slate-400">+{extra} more</span>}
    </div>
  );
}

function DeploymentPill({ employee }: { employee: Employee }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DEPLOYMENT_STATUS_BADGE[employee.deploymentStatus]}`}
    >
      {DEPLOYMENT_STATUS_LABELS[employee.deploymentStatus]}
    </span>
  );
}

function QuickActionsMenu({
  employee,
  onViewProfile,
}: {
  employee: Employee;
  onViewProfile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
            className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setOpen(false);
                onViewProfile();
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              View Profile
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/employees/${employee.id}`);
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Update Skills
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/projects');
              }}
              className="block w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Allocate to Project
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/exits');
              }}
              className="block w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50"
            >
              Offboard
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function EmployeeList() {
  const { token, isStaff } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [presentTodayIds, setPresentTodayIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [deploymentFilter, setDeploymentFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getEmployees(token), getDepartments(token)])
      .then(([emps, depts]) => {
        setEmployees(emps);
        setDepartments(depts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    const now = new Date();
    getAttendanceCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1)
      .then(({ days }) => {
        const todayStr = now.toISOString().slice(0, 10);
        const today = days.find((d) => d.date.slice(0, 10) === todayStr);
        setPresentTodayIds(new Set((today?.present || []).map((e) => e.id)));
      })
      .catch(() => {});
  }, [token]);

  const skillOptions = useMemo(() => {
    const names = new Set<string>();
    employees.forEach((e) => e.skills?.forEach((s) => names.add(s.skill.name)));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (term) {
        const matchesText =
          emp.fullName.toLowerCase().includes(term) ||
          emp.email.toLowerCase().includes(term) ||
          (emp.employeeCode || '').toLowerCase().includes(term) ||
          (emp.skills || []).some((s) => s.skill.name.toLowerCase().includes(term));
        if (!matchesText) return false;
      }
      if (departmentFilter && emp.departmentId !== departmentFilter) return false;
      if (skillFilter && !(emp.skills || []).some((s) => s.skill.name === skillFilter)) return false;
      if (deploymentFilter && emp.deploymentStatus !== deploymentFilter) return false;
      if (employmentTypeFilter && emp.employmentType !== employmentTypeFilter) return false;
      return true;
    });
  }, [employees, search, departmentFilter, skillFilter, deploymentFilter, employmentTypeFilter]);

  const metrics = useMemo(() => {
    const active = employees.filter((e) => e.status === 'ACTIVE');
    const billable = active.filter((e) => e.deploymentStatus === 'BILLABLE');
    const bench = active.filter((e) => e.deploymentStatus === 'BENCH');
    const deptCounts = new Map<string, number>();
    active.forEach((e) => {
      const name = e.department?.name || 'Unassigned';
      deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
    });
    const deptBreakdown = Array.from(deptCounts.entries()).sort((a, b) => b[1] - a[1]);
    const deploymentRate = active.length > 0 ? Math.round((billable.length / active.length) * 100) : 0;
    return { activeCount: active.length, deploymentRate, benchCount: bench.length, deptBreakdown };
  }, [employees]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Talent Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Centralized workforce hub, technical skill matrix, and active client deployment tracking.
          </p>
        </div>
        {isStaff && (
          <Link
            to="/employees/new"
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 whitespace-nowrap shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
          >
            + Onboard Talent
          </Link>
        )}
      </div>

      {/* Talent Intelligence Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={tileWrapperClass(TILE_THEMES[0])}>
          <MetricTile icon={UsersIcon} label="Total Active Talent" value={metrics.activeCount} />
        </div>
        <div className={tileWrapperClass(TILE_THEMES[3])}>
          <MetricTile icon={CheckCircleIcon} label="Billable Deployment Rate" value={`${metrics.deploymentRate}% Deployed`} />
        </div>
        <div className={tileWrapperClass(TILE_THEMES[1])}>
          <MetricTile icon={ClockIcon} label="Bench / Available Capacity" value={`${metrics.benchCount} Available`} />
        </div>
        <div className={tileWrapperClass(TILE_THEMES[2])}>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/25 text-white flex-shrink-0 shadow-inner">
              <GridIcon className="w-4 h-4" />
            </span>
            <p className="text-xs font-semibold text-white/90">Department Breakdown</p>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {metrics.deptBreakdown.slice(0, 4).map(([name, count]) => (
              <span key={name} className="inline-flex items-center rounded-full bg-white/25 text-white text-xs px-2 py-0.5">
                {count} {name}
              </span>
            ))}
            {metrics.deptBreakdown.length === 0 && <span className="text-xs text-white/70">No data yet</span>}
          </div>
        </div>
      </div>

      {/* Control bar: view toggle + search + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or skill..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">All Skills</option>
          {skillOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={deploymentFilter}
          onChange={(e) => setDeploymentFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">All Deployment Statuses</option>
          {DEPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {DEPLOYMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={employmentTypeFilter}
          onChange={(e) => setEmploymentTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">All Employment Types</option>
          {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
          >
            <UsersIcon className="w-4 h-4" /> Directory Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
          >
            <GridIcon className="w-4 h-4" /> Talent Cards
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : employees.length === 0 ? (
        <p className="text-slate-500">No talent records yet — onboard your first one.</p>
      ) : filteredEmployees.length === 0 ? (
        <p className="text-slate-500">No talent match your search/filters.</p>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Talent Member</th>
                <th className="px-4 py-3 font-medium">ID &amp; Seniority</th>
                <th className="px-4 py-3 font-medium">Role &amp; Department</th>
                <th className="px-4 py-3 font-medium">Primary Tech Stack</th>
                <th className="px-4 py-3 font-medium">Client Allocation</th>
                <th className="px-4 py-3 font-medium">Deployment Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const allocation = getClientAllocation(emp);
                const online = presentTodayIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setDrawerEmployeeId(emp.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (emp.photoUrl) setLightboxUrl(`${API_BASE}${emp.photoUrl}`);
                          }}
                          className="relative h-9 w-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0"
                          title={emp.photoUrl ? 'Click to enlarge' : undefined}
                        >
                          {emp.photoUrl && (
                            <img src={`${API_BASE}${emp.photoUrl}`} alt={emp.fullName} className="h-full w-full object-cover" />
                          )}
                          <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            title={online ? 'Checked in today' : 'Not checked in yet'}
                          />
                        </button>
                        <div>
                          <p className="text-slate-800 font-medium">{emp.fullName}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {emp.employeeCode || '—'}
                      <span className="text-slate-300"> • </span>
                      {EXPERIENCE_LEVEL_LABELS[emp.experienceLevel]}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{emp.designation?.name || '—'}</p>
                      <p className="text-xs text-slate-500">{emp.department?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TechChips employee={emp} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{allocation.label}</td>
                    <td className="px-4 py-3">
                      <DeploymentPill employee={emp} />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {isStaff ? (
                        <QuickActionsMenu employee={emp} onViewProfile={() => setDrawerEmployeeId(emp.id)} />
                      ) : (
                        <button
                          onClick={() => setDrawerEmployeeId(emp.id)}
                          className="text-xs text-mitra-accentFrom hover:underline"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const allocation = getClientAllocation(emp);
            const online = presentTodayIds.has(emp.id);
            return (
              <div
                key={emp.id}
                onClick={() => setDrawerEmployeeId(emp.id)}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                      {emp.photoUrl && (
                        <img src={`${API_BASE}${emp.photoUrl}`} alt={emp.fullName} className="h-full w-full object-cover" />
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{emp.fullName}</p>
                      <p className="text-xs text-slate-400">
                        {emp.employeeCode || '—'} • {EXPERIENCE_LEVEL_LABELS[emp.experienceLevel]}
                      </p>
                    </div>
                  </div>
                  {isStaff && <QuickActionsMenu employee={emp} onViewProfile={() => setDrawerEmployeeId(emp.id)} />}
                </div>
                <p className="text-sm text-slate-600 mt-3">{emp.designation?.name || '—'}</p>
                <p className="text-xs text-slate-500">{emp.department?.name || '—'}</p>
                <div className="mt-3">
                  <TechChips employee={emp} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{allocation.label}</span>
                  <DeploymentPill employee={emp} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Talent" className="max-h-full max-w-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {drawerEmployeeId && (
        <TalentProfileDrawer
          employeeId={drawerEmployeeId}
          isStaff={isStaff}
          onClose={() => setDrawerEmployeeId(null)}
        />
      )}
    </div>
  );
}
