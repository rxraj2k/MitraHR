import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyAssets, getMyProjects } from '../lib/api';
import { AssetAssignment, MyProjectAssignment } from '../types';
import { CATEGORY_LABELS as ASSET_CATEGORY_LABELS, STATUS_BADGE as ASSET_STATUS_BADGE, STATUS_LABELS as ASSET_STATUS_LABELS } from '../lib/assetCategories';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Home() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState<MyProjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [myAssets, setMyAssets] = useState<AssetAssignment[]>([]);

  const employeeId = user?.kind === 'EMPLOYEE' ? user.id : user?.employeeId;

  useEffect(() => {
    if (!token || !employeeId) return;
    setLoading(true);
    getMyProjects(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
    getMyAssets(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyAssets)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, employeeId]);

  const active = assignments.filter((a) => !a.endDate);
  const currentAssets = myAssets.filter((a) => !a.returnedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name?.split(' ')[0]}</h1>

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Projects</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : active.length === 0 ? (
            <p className="text-slate-500 text-sm">Not currently staffed on a project.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Allocation</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {active.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 font-medium text-slate-700">{a.project.name}</td>
                      <td className="py-2 text-slate-500">{a.project.client.name}</td>
                      <td className="py-2 text-slate-500">{a.roleOnProject || '—'}</td>
                      <td className="py-2 text-slate-500">{a.allocationPercent}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[a.project.status]}`}>
                          {a.project.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Assets</h2>
          {currentAssets.length === 0 ? (
            <p className="text-slate-500 text-sm">Nothing currently checked out to you.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Asset</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Tag</th>
                    <th className="pb-2 font-medium">Since</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAssets.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 font-medium text-slate-700">{a.asset?.name}</td>
                      <td className="py-2 text-slate-500">{a.asset ? ASSET_CATEGORY_LABELS[a.asset.category] : '—'}</td>
                      <td className="py-2 text-slate-500">{a.asset?.assetTag}</td>
                      <td className="py-2 text-slate-500">{new Date(a.assignedAt).toLocaleDateString()}</td>
                      <td className="py-2">
                        {a.asset && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ASSET_STATUS_BADGE[a.asset.status]}`}>
                            {ASSET_STATUS_LABELS[a.asset.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-slate-500">
        This is your MitraHR home. Use the tabs on the left to manage your team, leaves, projects, and more.
      </p>
    </div>
  );
}
