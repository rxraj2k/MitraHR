import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { getUtilization } from '../../lib/api';
import { UtilizationEntry, UtilizationResponse, UtilizationStatus } from '../../types';

const STATUS_LABELS: Record<UtilizationStatus, string> = {
  BENCH: 'On Bench',
  PARTIAL: 'Partially Allocated',
  FULL: 'Fully Allocated',
  OVER: 'Over-Allocated',
};

const STATUS_BADGE: Record<UtilizationStatus, string> = {
  BENCH: 'bg-slate-100 text-slate-500',
  PARTIAL: 'bg-amber-100 text-amber-700',
  FULL: 'bg-green-100 text-green-700',
  OVER: 'bg-red-100 text-red-700',
};

const STATUS_BAR: Record<UtilizationStatus, string> = {
  BENCH: 'bg-slate-300',
  PARTIAL: 'bg-amber-500',
  FULL: 'bg-green-500',
  OVER: 'bg-red-500',
};

const FILTERS: { key: UtilizationStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'BENCH', label: 'On Bench' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'FULL', label: 'Full' },
  { key: 'OVER', label: 'Over-Allocated' },
];

function AllocationBar({ entry }: { entry: UtilizationEntry }) {
  const width = Math.min(entry.totalAllocation, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
        <div className={`h-full ${STATUS_BAR[entry.status]}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-slate-600 text-xs w-10">{entry.totalAllocation}%</span>
    </div>
  );
}

export default function UtilizationPage() {
  const { token } = useAuth();
  const [data, setData] = useState<UtilizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<UtilizationStatus | 'ALL'>('ALL');

  function load() {
    if (!token) return;
    getUtilization(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);
  useAutoRefresh(load);

  const employees = data?.employees || [];
  const shown = filter === 'ALL' ? employees : employees.filter((e) => e.status === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Bench & Utilization</h1>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">On Bench</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{data?.summary.bench ?? 0}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-600">Partially Allocated</p>
              <p className="text-2xl font-semibold text-amber-900 mt-1">{data?.summary.partial ?? 0}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-medium text-green-600">Fully Allocated</p>
              <p className="text-2xl font-semibold text-green-900 mt-1">{data?.summary.full ?? 0}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-medium text-red-600">Over-Allocated</p>
              <p className="text-2xl font-semibold text-red-900 mt-1">{data?.summary.over ?? 0}</p>
            </div>
          </div>

          <div className="flex gap-2 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-lg ${filter === f.key ? 'bg-mitra-navy text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {shown.length === 0 ? (
              <p className="text-slate-500 text-sm">No one matches this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Employee</th>
                      <th className="pb-2 font-medium">Department / Designation</th>
                      <th className="pb-2 font-medium">Allocation</th>
                      <th className="pb-2 font-medium">Projects</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2">
                          <Link to={`/employees/${e.id}`} className="font-medium text-mitra-accentFrom hover:underline">
                            {e.fullName}
                          </Link>
                        </td>
                        <td className="py-2 text-slate-500">
                          {[e.designationName, e.departmentName].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-2">
                          <AllocationBar entry={e} />
                        </td>
                        <td className="py-2 text-slate-500">
                          {e.assignments.length === 0 ? (
                            '—'
                          ) : (
                            <ul className="space-y-0.5">
                              {e.assignments.map((a) => (
                                <li key={a.projectId}>
                                  <Link to={`/projects/${a.projectId}`} className="hover:underline">
                                    {a.projectName}
                                  </Link>{' '}
                                  <span className="text-slate-400">
                                    ({a.clientName} · {a.allocationPercent}%)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[e.status]}`}>
                            {STATUS_LABELS[e.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
