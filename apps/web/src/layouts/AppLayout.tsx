import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Sidebar nav is deliberately data-driven — future sprints add a module by
// adding one line here, not by restructuring the layout again.
const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/employees', label: 'Employees', end: false },
  { to: '/org-chart', label: 'Team Topology', end: false },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-lg px-3 py-2 text-sm transition-colors',
    isActive ? 'bg-white/10 text-white font-medium' : 'text-slate-300 hover:bg-white/5 hover:text-white',
  ].join(' ');
}

export default function AppLayout() {
  const { user, isStaff, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 flex-shrink-0 bg-mitra-navy flex flex-col">
        <div className="px-6 py-5">
          <span className="font-semibold text-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
            MitraHR
          </span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {isStaff && (
          <div className="px-3 pb-4 pt-4 border-t border-white/10">
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
          </div>
        )}
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
