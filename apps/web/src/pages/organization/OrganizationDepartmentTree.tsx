import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { useOrganizationData } from './useOrganizationData';

// The old Organization page's "Department Tree" tab, now its own route
// (/organization/department-tree).
export default function OrganizationDepartmentTree() {
  const navigate = useNavigate();
  const { employees, departments, loading, error } = useOrganizationData();

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const grouped = departments.map((d) => ({
    department: d,
    members: activeEmployees.filter((e) => e.departmentId === d.id),
  }));
  const unassignedCount = activeEmployees.filter((e) => !e.departmentId).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Department Tree</h1>
        <p className="text-sm text-slate-500 mt-1">Click a department to see its full roster in the Directory.</p>
      </div>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

      <div className="flex flex-col items-center">
        <div className="bg-mitra-navy text-white rounded-xl px-5 py-3 text-sm font-semibold mb-6">
          Offshore Mitra · {activeEmployees.length} Active Employees
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.map(({ department, members }) => (
            <button
              key={department.id}
              type="button"
              onClick={() => navigate(`/organization/directory?dept=${department.id}`)}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">{department.name}</p>
                <span className="text-xs text-slate-400">
                  {members.length} member{members.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex -space-x-2">
                {members.slice(0, 6).map((m) => (
                  <Avatar key={m.id} name={m.fullName} photoUrl={m.photoUrl} size="sm" />
                ))}
                {members.length > 6 && (
                  <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500">
                    +{members.length - 6}
                  </div>
                )}
              </div>
            </button>
          ))}
          {unassignedCount > 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4">
              <p className="text-sm font-medium text-slate-500 mb-1">Unassigned</p>
              <p className="text-xs text-slate-400">
                {unassignedCount} employee{unassignedCount === 1 ? '' : 's'} with no department set
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
