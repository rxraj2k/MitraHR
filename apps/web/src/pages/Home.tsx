import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name?.split(' ')[0]}</h1>
      <p className="text-slate-500 mt-2">
        This is your MitraHR home. Use the Employees tab above to manage your team.
      </p>
    </div>
  );
}
