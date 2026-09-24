import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCompanyDocuments, getMyEmployeeDocuments, openAuthedFile } from '../../lib/api';
import { CompanyDocument, EmployeeDocument } from '../../types';
import { EMPLOYEE_DOCUMENT_TYPE_LABELS, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS, getExpiryStatus } from '../../lib/documentCategories';

// My Space's "Files" sub-view — the personal + company document lists that
// used to live in the "My Documents" card on Home, pulled out into their
// own dedicated sub-view under the new My Space workspace.
export default function MySpaceFiles() {
  const { user, token } = useAuth();
  const myEmployeeId = user?.kind === 'EMPLOYEE' ? user.id : user?.employeeId;

  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      myEmployeeId ? getMyEmployeeDocuments(token, user?.kind === 'STAFF' ? myEmployeeId : undefined).catch(() => []) : Promise.resolve([]),
      getCompanyDocuments(token).catch(() => []),
    ])
      .then(([myDocs, companyDocs]) => {
        setMyDocuments(myDocs);
        setCompanyDocuments(companyDocs);
      })
      .finally(() => setLoading(false));
  }, [token, myEmployeeId, user?.kind]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Files</h1>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {myDocuments.length === 0 && companyDocuments.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents on file yet.</p>
          ) : (
            <div className="space-y-5">
              {myDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">On your record</p>
                  <ul className="space-y-1.5">
                    {myDocuments.map((doc) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      return (
                        <li key={doc.id} className="flex items-center justify-between text-sm">
                          <button
                            onClick={() => token && myEmployeeId && openAuthedFile(token, `/employees/${myEmployeeId}/documents/${doc.id}/file`)}
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
    </div>
  );
}
