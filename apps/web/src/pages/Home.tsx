import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCompanyDocuments, getMyAssets, getMyEmployeeDocuments, getMyProjects, openAuthedFile } from '../lib/api';
import { AssetAssignment, CompanyDocument, EmployeeDocument, MyProjectAssignment } from '../types';
import { CATEGORY_LABELS as ASSET_CATEGORY_LABELS, STATUS_BADGE as ASSET_STATUS_BADGE, STATUS_LABELS as ASSET_STATUS_LABELS } from '../lib/assetCategories';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  getExpiryStatus,
} from '../lib/documentCategories';

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
  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);

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
    getMyEmployeeDocuments(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyDocuments)
      .catch(() => {});
    getCompanyDocuments(token)
      .then(setCompanyDocuments)
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

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Documents</h2>
          {myDocuments.length === 0 && companyDocuments.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents on file yet.</p>
          ) : (
            <div className="space-y-4">
              {myDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">On your record</p>
                  <ul className="space-y-1.5">
                    {myDocuments.map((doc) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      return (
                        <li key={doc.id} className="flex items-center justify-between text-sm">
                          <button
                            onClick={() => token && employeeId && openAuthedFile(token, `/employees/${employeeId}/documents/${doc.id}/file`)}
                            className="text-slate-700 hover:text-mitra-accentFrom text-left"
                          >
                            {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                              doc.documentType}{' '}
                            — {doc.fileName}
                          </button>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
                            {EXPIRY_STATUS_LABELS[status]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {companyDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Company documents</p>
                  <ul className="space-y-1.5">
                    {companyDocuments.map((doc) => (
                      <li key={doc.id}>
                        <button
                          onClick={() => token && openAuthedFile(token, `/company-documents/${doc.id}/file`)}
                          className="text-sm text-slate-700 hover:text-mitra-accentFrom text-left"
                        >
                          {doc.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
