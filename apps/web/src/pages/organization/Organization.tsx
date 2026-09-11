import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  BuildingIcon,
  ChevronRightIcon,
  FileTextIcon,
  PhoneIcon,
  SearchIcon,
  SparkleIcon,
  StarIcon,
  UsersIcon,
} from '../../components/icons';
import {
  API_BASE,
  addFavorite,
  getCompanyDocuments,
  getDepartments,
  getEmployees,
  getMyFavorites,
  getUpcomingBirthdays,
  openAuthedFile,
  removeFavorite,
} from '../../lib/api';
import { CompanyDocument, Employee, FavoriteColleague, LookupItem, UpcomingBirthday } from '../../types';
import OrgChart from '../OrgChart';
import AnnouncementsTab from './AnnouncementsTab';
import EmployeeProfileModal from './EmployeeProfileModal';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

// Tailwind can't resolve a class built from a runtime template string
// (`w-${size}`), so sizes are a small literal lookup instead.
export const AVATAR_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-11 h-11 text-xs',
  lg: 'w-16 h-16 text-sm',
};

export function Avatar({
  name,
  photoUrl,
  size = 'md',
  shape = 'circle',
}: {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}) {
  const dim = AVATAR_SIZE_CLASSES[size];
  const rounding = shape === 'square' ? 'rounded-xl' : 'rounded-full';
  return photoUrl ? (
    <img src={`${API_BASE}${photoUrl}`} alt="" className={`${dim} ${rounding} object-cover flex-shrink-0`} />
  ) : (
    <div className={`${dim} ${rounding} bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 font-medium`}>
      {initials(name)}
    </div>
  );
}

type TabKey =
  | 'overview'
  | 'announcements'
  | 'policies'
  | 'employee-tree'
  | 'department-tree'
  | 'department-directory'
  | 'birthdays'
  | 'new-hires';

const TABS: TabBarItem<TabKey>[] = [
  { key: 'overview', label: 'Overview', color: 'neutral' },
  { key: 'announcements', label: 'Announcements', color: 'neutral' },
  { key: 'policies', label: 'Policies', color: 'neutral' },
  { key: 'employee-tree', label: 'Employee Tree', color: 'neutral' },
  { key: 'department-tree', label: 'Department Tree', color: 'neutral' },
  { key: 'department-directory', label: 'Department Directory', color: 'neutral' },
  { key: 'birthdays', label: 'Birthday Folks', color: 'neutral' },
  { key: 'new-hires', label: 'New Hires', color: 'neutral' },
];

// ---------------------------------------------------------------------------
// DESIGN NOTE: modeled on Zoho People's Organization space, at the user's
// request (screenshot + product docs reviewed). Several tabs are thin new
// views over data that already existed elsewhere in MitraHR rather than new
// features: Employee Tree reuses Team Topology (OrgChart) directly, Policies
// reuses the existing company-wide documents (Document Management), and
// Birthday Folks reuses the existing upcoming-birthdays lookup (previously
// only shown as a small Home widget). Department Tree/Directory/New
// Hires/Overview are new views but read from Employee + Department, no new
// backend needed. Announcements and "favorite colleagues" are the two
// genuinely new features — see AnnouncementsTab.tsx and the favorites
// endpoints in lib/api.ts.
// ---------------------------------------------------------------------------

export default function Organization() {
  const { token, isStaff } = useAuth();
  const [tab, setTab] = useState<TabKey>('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteColleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<string | undefined>();
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([getEmployees(token), getDepartments(token), getMyFavorites(token).catch(() => [])])
      .then(([e, d, f]) => {
        setEmployees(e);
        setDepartments(d);
        setFavorites(f);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleToggleFavorite(employeeId: string, isFavorite: boolean) {
    if (!token) return;
    if (isFavorite) {
      setFavorites((f) => f.filter((fav) => fav.favoriteEmployee.id !== employeeId));
      await removeFavorite(token, employeeId).catch(() => {});
    } else {
      const employee = employees.find((e) => e.id === employeeId);
      if (employee) {
        setFavorites((f) => [...f, { id: `pending-${employeeId}`, createdAt: new Date().toISOString(), favoriteEmployee: employee }]);
      }
      await addFavorite(token, employeeId).catch(() => {});
    }
  }

  function goToDepartment(departmentId: string) {
    setDirectoryDeptFilter(departmentId);
    setTab('department-directory');
  }

  if (!token) return null;

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-semibold text-slate-800">Organization</h1>
        <p className="text-sm text-slate-500 mt-1">Company overview, announcements, policies, and the team directory.</p>
      </div>

      {error && <p className="text-sm text-rose-600 my-4">{error}</p>}

      <div className="mt-4">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab employees={employees} departments={departments} onNavigateTab={setTab} />}
          {tab === 'announcements' && (
            <AnnouncementsTab token={token} isStaff={isStaff} departments={departments} employees={employees} />
          )}
          {tab === 'policies' && <PoliciesTab token={token} />}
          {tab === 'employee-tree' && <EmployeeTreeTab />}
          {tab === 'department-tree' && (
            <DepartmentTreeTab employees={employees} departments={departments} onSelectDepartment={goToDepartment} />
          )}
          {tab === 'department-directory' && (
            <DepartmentDirectoryTab
              employees={employees}
              departments={departments}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              initialDepartmentId={directoryDeptFilter}
              onOpenProfile={setProfileEmployeeId}
            />
          )}
          {tab === 'birthdays' && <BirthdaysTab token={token} />}
          {tab === 'new-hires' && <NewHiresTab employees={employees} />}
        </>
      )}

      {profileEmployeeId && (
        <EmployeeProfileModal
          employees={employees}
          departments={departments}
          employeeId={profileEmployeeId}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setProfileEmployeeId(null)}
          onSelectEmployee={setProfileEmployeeId}
        />
      )}
    </div>
  );
}

function EmployeeTreeTab() {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Click any card to open that employee's profile. Use the − / + button to collapse or expand a team.
      </p>
      <OrgChart hideHeader />
    </div>
  );
}

function OverviewTab({
  employees,
  departments,
  onNavigateTab,
}: {
  employees: Employee[];
  departments: LookupItem[];
  onNavigateTab: (tab: TabKey) => void;
}) {
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const now = new Date();
  const newHiresThisMonth = activeEmployees.filter((e) => {
    if (!e.dateOfJoining) return false;
    const d = new Date(e.dateOfJoining);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;

  const tiles = [
    { label: 'Active Employees', value: activeEmployees.length, icon: UsersIcon },
    { label: 'Departments', value: departments.length, icon: BuildingIcon },
    { label: 'New Hires This Month', value: newHiresThisMonth, icon: SparkleIcon },
  ];

  const quickLinks: { label: string; tab: TabKey }[] = [
    { label: 'Department Directory', tab: 'department-directory' },
    { label: 'Employee Tree', tab: 'employee-tree' },
    { label: 'Department Tree', tab: 'department-tree' },
    { label: 'Policies', tab: 'policies' },
    { label: 'Birthday Folks', tab: 'birthdays' },
    { label: 'New Hires', tab: 'new-hires' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <t.icon className="w-4 h-4" />
              <p className="text-xs font-medium">{t.label}</p>
            </div>
            <p className="text-2xl font-semibold text-slate-800 mt-1">{t.value}</p>
          </div>
        ))}
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Links</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map((q) => (
          <button
            key={q.tab}
            type="button"
            onClick={() => onNavigateTab(q.tab)}
            className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 hover:shadow-sm text-sm text-slate-700 flex items-center justify-between group"
          >
            {q.label}
            <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-mitra-accentFrom" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PoliciesTab({ token }: { token: string }) {
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyDocuments(token)
      .then(setDocs)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-slate-400">Loading policies…</p>;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Company policies, templates, and handbooks. Manage the full set from{' '}
        <Link to="/documents" className="text-mitra-accentFrom hover:underline">
          Document Management
        </Link>
        .
      </p>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-400">No company documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openAuthedFile(token, `/company-documents/${d.id}/file`)}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40 flex items-start gap-3"
            >
              <FileTextIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-800">{d.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {d.category} · Updated {new Date(d.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentTreeTab({
  employees,
  departments,
  onSelectDepartment,
}: {
  employees: Employee[];
  departments: LookupItem[];
  onSelectDepartment: (departmentId: string) => void;
}) {
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const grouped = departments.map((d) => ({
    department: d,
    members: activeEmployees.filter((e) => e.departmentId === d.id),
  }));
  const unassignedCount = activeEmployees.filter((e) => !e.departmentId).length;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">Click a department to see its full roster in Department Directory.</p>
      <div className="flex flex-col items-center">
        <div className="bg-mitra-navy text-white rounded-xl px-5 py-3 text-sm font-semibold mb-6">
          Offshore Mitra · {activeEmployees.length} Active Employees
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.map(({ department, members }) => (
            <button
              key={department.id}
              type="button"
              onClick={() => onSelectDepartment(department.id)}
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

function DepartmentDirectoryTab({
  employees,
  departments,
  favorites,
  onToggleFavorite,
  initialDepartmentId,
  onOpenProfile,
}: {
  employees: Employee[];
  departments: LookupItem[];
  favorites: FavoriteColleague[];
  onToggleFavorite: (employeeId: string, isFavorite: boolean) => void;
  initialDepartmentId?: string;
  onOpenProfile: (employeeId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(initialDepartmentId || 'ALL');

  useEffect(() => {
    if (initialDepartmentId) setSelectedDept(initialDepartmentId);
  }, [initialDepartmentId]);

  const filteredDepartments = departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const shown = selectedDept === 'ALL' ? activeEmployees : activeEmployees.filter((e) => e.departmentId === selectedDept);
  const currentDeptName = selectedDept === 'ALL' ? 'All Departments' : departments.find((d) => d.id === selectedDept)?.name || '';
  const favoriteIds = new Set(favorites.map((f) => f.favoriteEmployee.id));

  return (
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
                  onClick={() => onOpenProfile(e.id)}
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
                          onToggleFavorite(e.id, isFavorite);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.stopPropagation();
                            onToggleFavorite(e.id, isFavorite);
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
  );
}

function BirthdaysTab({ token }: { token: string }) {
  const [people, setPeople] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUpcomingBirthdays(token, 365)
      .then(setPeople)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (people.length === 0) return <p className="text-sm text-slate-400">No birthdays on file yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {people.map((p) => (
        <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Avatar name={p.fullName} photoUrl={p.photoUrl} />
          <div>
            <p className="text-sm font-medium text-slate-800">{p.fullName}</p>
            <p className="text-xs text-slate-400">
              {p.daysUntil === 0 ? '🎂 Today!' : p.daysUntil === 1 ? 'Tomorrow' : `In ${p.daysUntil} days`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function NewHiresTab({ employees }: { employees: Employee[] }) {
  const sorted = [...employees]
    .filter((e) => e.dateOfJoining && e.status === 'ACTIVE')
    .sort((a, b) => new Date(b.dateOfJoining as string).getTime() - new Date(a.dateOfJoining as string).getTime())
    .slice(0, 20);

  if (sorted.length === 0) return <p className="text-sm text-slate-400">No joining dates on file yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((e) => (
        <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Avatar name={e.fullName} photoUrl={e.photoUrl} />
          <div>
            <p className="text-sm font-medium text-slate-800">{e.fullName}</p>
            <p className="text-xs text-slate-400">
              {e.designation?.name || '—'} · {e.department?.name || 'Unassigned'}
            </p>
            <p className="text-xs text-slate-400">Joined {new Date(e.dateOfJoining as string).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
