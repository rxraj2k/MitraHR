import { Avatar } from '../../components/Avatar';
import { useOrganizationData } from './useOrganizationData';

// Full new-hires list — reachable from Overview's "New Hires" widget
// ("View all →"), not a primary sidebar sub-view itself.
export default function OrganizationNewHires() {
  const { employees, loading } = useOrganizationData();

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const sorted = [...employees]
    .filter((e) => e.dateOfJoining && e.status === 'ACTIVE')
    .sort((a, b) => new Date(b.dateOfJoining as string).getTime() - new Date(a.dateOfJoining as string).getTime())
    .slice(0, 20);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">New Hires</h1>
        <p className="text-sm text-slate-500 mt-1">The most recently joined active employees.</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No joining dates on file yet.</p>
      ) : (
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
      )}
    </div>
  );
}
