import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { getUpcomingBirthdays } from '../../lib/api';
import { UpcomingBirthday } from '../../types';

// Full year-round birthday list — reachable from Overview's "Birthday
// Folks" widget ("View all →"), not a primary sidebar sub-view itself
// (Overview already surfaces the near-term ones).
export default function OrganizationBirthdays() {
  const { token } = useAuth();
  const [people, setPeople] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getUpcomingBirthdays(token, 365)
      .then(setPeople)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Birthday Folks</h1>
        <p className="text-sm text-slate-500 mt-1">Everyone's upcoming birthday, for the year ahead.</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-slate-400">No birthdays on file yet.</p>
      ) : (
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
      )}
    </div>
  );
}
