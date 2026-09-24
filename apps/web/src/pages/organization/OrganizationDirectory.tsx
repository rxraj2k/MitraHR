import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { useOrganizationData } from './useOrganizationData';
import EmployeeProfileModal from './EmployeeProfileModal';
import { PhoneIcon, SearchIcon, StarIcon } from '../../components/icons';

// The old Organization page's "Department Directory" tab, now its own route
// (/organization/directory) under the sidebar's Organization space. The
// department filter travels as a `?dept=` query param so Overview's
// Department Snapshot badges and Department Tree's cards can deep-link
// straight into a filtered view.
export default function OrganizationDirectory() {
  const [searchParams] = useSearchParams();
  const initialDepartmentId = searchParams.get('dept') || undefined;
  const { employees, departments, favorites, loading, error, toggleFavorite } = useOrganizationData();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(initialDepartmentId || 'ALL');
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (initialDepartmentId) setSelectedDept(initialDepartmentId);
  }, [initialDepartmentId]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const filteredDepartments = departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const shown = selectedDept === 'ALL' ? activeEmployees : activeEmployees.filter((e) => e.departmentId === selectedDept);
  const currentDeptName = selectedDept === 'ALL' ? 'All Departments' : departments.find((d) => d.id === selectedDept)?.name || '';
  const favoriteIds = new Set(favorites.map((f) => f.favoriteEmployee.id));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Directory</h1>
        <p className="text-sm text-slate-500 mt-1">Browse the team by department.</p>
      </div>

      {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <div>
          <div className="relative mb-3">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Department"
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedDept('ALL')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                selectedDept === 'ALL' ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Departments
            </button>
            {filteredDepartments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDept(d.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  selectedDept === d.id ? 'bg-mitra-accentFrom/10 text-mitra-accentFrom font-medium' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">{currentDeptName}</p>
            <span className="text-xs text-slate-400">
              {shown.length} Member{shown.length === 1 ? '' : 's'}
            </span>
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-slate-400">No employees in this department yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map((e) => {
                const isFavorite = favoriteIds.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setProfileEmployeeId(e.id)}
                    className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-mitra-accentFrom/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="relative">
                        <Avatar name={e.fullName} photoUrl={e.photoUrl} size="lg" shape="square" />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            e.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={e.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2 pt-0.5">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleFavorite(e.id, isFavorite);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              ev.stopPropagation();
                              toggleFavorite(e.id, isFavorite);
                            }
                          }}
                          className={isFavorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <StarIcon className="w-4 h-4" filled={isFavorite} />
                        </span>
                        {e.phone && (
                          <a
                            href={`tel:${e.phone}`}
                            onClick={(ev) => ev.stopPropagation()}
                            className="text-slate-400 hover:text-mitra-accentFrom"
                            title={`Call ${e.phone}`}
                          >
                            <PhoneIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {e.employeeCode ? `${e.employeeCode} - ` : ''}
                      {e.fullName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{e.email}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{e.designation?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{e.department?.name || 'Unassigned'}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {profileEmployeeId && (
        <EmployeeProfileModal
          employees={employees}
          departments={departments}
          employeeId={profileEmployeeId}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setProfileEmployeeId(null)}
          onSelectEmployee={setProfileEmployeeId}
        />
      )}
    </div>
  );
}
