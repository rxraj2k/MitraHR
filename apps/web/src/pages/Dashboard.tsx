import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-mitra-navy text-white px-6 py-4 flex items-center justify-between">
        <span className="font-semibold bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
          MitraHR
        </span>
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
        <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-500 mt-2">
          This is the empty MitraHR home screen — Sprint 0 complete. Modules will land here sprint by sprint.
        </p>
      </main>
    </div>
  );
}
