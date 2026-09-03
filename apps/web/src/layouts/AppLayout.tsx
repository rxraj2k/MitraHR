import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'text-white' : 'text-slate-300 hover:text-white';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-mitra-navy text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-semibold bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
            MitraHR
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/employees" className={linkClass}>
              Employees
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300">
            {user?.name} ({user?.role})
          </span>
          <button onClick={logout} className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/20">
            Log out
          </button>
        </div>
      </header>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}
