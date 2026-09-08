import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  DatabaseIcon,
  GaugeIcon,
  GraduationCapIcon,
  HomeIcon,
  PackageIcon,
  ShareNetworkIcon,
  UsersIcon,
} from '../components/icons';

// Sidebar nav is deliberately data-driven — future sprints add a module by
// adding one line here, not by restructuring the layout again.
const STAFF_NAV_ITEMS = [
  { to: '/', label: 'Home', end: true, icon: HomeIcon },
  { to: '/employees', label: 'Employees', end: false, icon: UsersIcon },
  { to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { to: '/leave', label: 'Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  { to: '/clients', label: 'Client Management', end: false, icon: BuildingIcon },
  { to: '/projects', label: 'Project Management', end: false, icon: BriefcaseIcon },
  { to: '/utilization', label: 'Bench & Utilization', end: false, icon: GaugeIcon },
  { to: '/training', label: 'Learning Center', end: false, icon: GraduationCapIcon },
  { to: '/assets', label: 'Asset Management', end: false, icon: PackageIcon },
  { to: '/settings', label: 'Master Data', end: false, icon: DatabaseIcon },
];

const EMPLOYEE_NAV_ITEMS = [
  { to: '/', label: 'Home', end: true, icon: HomeIcon },
  { to: '/employees', label: 'Employees', end: false, icon: UsersIcon },
  { to: '/org-chart', label: 'Team Topology', end: false, icon: ShareNetworkIcon },
  { to: '/my-leave', label: 'My Leaves & Attendance', end: false, icon: CalendarCheckIcon },
  { to: '/my-learning', label: 'My Learning', end: false, icon: GraduationCapIcon },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white',
  ].join(' ');
}

export default function AppLayout() {
  const { user, isStaff, logout } = useAuth();
  const navItems = isStaff ? STAFF_NAV_ITEMS : EMPLOYEE_NAV_ITEMS;

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-mitra-navy flex flex-col">
        <div className="px-6 py-5">
          <span className="font-semibold text-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
            MitraHR
          </span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-end gap-4">
          <span className="text-sm text-slate-500">
            {user?.name} <span className="text-slate-400">({user?.role})</span>
          </span>
          <button
            onClick={logout}
            className="text-sm rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            Log out
          </button>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
