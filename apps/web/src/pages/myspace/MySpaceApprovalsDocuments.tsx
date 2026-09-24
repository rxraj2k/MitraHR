import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  acknowledgeCompanyDocument,
  getCompanyDocuments,
  getLeaveRequests,
  getMyEmployeeDocuments,
  openAuthedFile,
} from '../../lib/api';
import { CompanyDocument, EmployeeDocument, LeaveRequest } from '../../types';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  getExpiryStatus,
} from '../../lib/documentCategories';
import { ClipboardListIcon, FileTextIcon } from '../../components/icons';

// My Space's "My Approvals & Documents" sub-view — merges what were two
// separate sub-views (the "My Approvals & Tasks" widget that used to live
// only on My Space's Overview page, and the standalone Files page) into
// one, per the latest nav spec's 3-item My Space list. Two headed
// sections stacked vertically rather than an in-page tab bar — same
// reasoning as MySpaceAttendanceLeave: the whole point of this nav round
// was moving sub-view switching into the sidebar/header.
export default function MySpaceApprovalsDocuments() {
  const { user, token } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;
  // Files use the same "resolve my own employee record" pattern as the
  // original standalone Files page — kept verbatim rather than folded into
  // myEmployeeId above, since it's deliberately undefined for an unlinked
  // STAFF session (see getMyEmployeeDocuments call below).
  const filesEmployeeId = user?.kind === 'EMPLOYEE' ? user.id : user?.employeeId;

  const [pendingLeave, setPendingLeave] = useState<LeaveRequest[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<CompanyDocument[]>([]);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [approvalsLoading, setApprovalsLoading] = useState(true);

  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  useEffect(() => {
    if (!token || !myEmployeeId) {
      setApprovalsLoading(false);
      return;
    }
    Promise.all([getLeaveRequests(token, { employeeId: myEmployeeId, status: 'PENDING' }), getCompanyDocuments(token)])
      .then(([pending, docs]) => {
        setPendingLeave(pending);
        setPendingPolicies(docs.filter((d) => d.category === 'POLICY' && d.acknowledgedByMe === false));
      })
      .catch(() => {})
      .finally(() => setApprovalsLoading(false));
  }, [token, myEmployeeId]);

  useEffect(() => {
    if (!token) return;
    setFilesLoading(true);
    Promise.all([
      filesEmployeeId
        ? getMyEmployeeDocuments(token, user?.kind === 'STAFF' ? filesEmployeeId : undefined).catch(() => [])
        : Promise.resolve([]),
      getCompanyDocuments(token).catch(() => []),
    ])
      .then(([myDocs, companyDocs]) => {
        setMyDocuments(myDocs);
        setCompanyDocuments(companyDocs);
      })
      .finally(() => setFilesLoading(false));
  }, [token, filesEmployeeId, user?.kind]);

  async function handleAcknowledge(id: string) {
    if (!token) return;
    setAckingId(id);
    try {
      await acknowledgeCompanyDocument(token, id);
      setPendingPolicies((docs) => docs.filter((d) => d.id !== id));
    } finally {
      setAckingId(null);
    }
  }

  const totalPendingApprovals = pendingLeave.length + pendingPolicies.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">My Approvals & Documents</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardListIcon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">My Approvals & Tasks</h3>
          {totalPendingApprovals > 0 && (
            <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
              {totalPendingApprovals}
            </span>
          )}
        </div>
        {approvalsLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : totalPendingApprovals === 0 ? (
          <p className="text-sm text-slate-400">Nothing pending — you're all caught up.</p>
        ) : (
          <div className="space-y-2">
            {pendingLeave.map((lr) => (
              <div
                key={lr.id}
                className="flex items-center justify-between text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
              >
                <span className="text-slate-700">
                  Leave request · {lr.leaveType.name} · {new Date(lr.startDate).toLocaleDateString()} –{' '}
                  {new Date(lr.endDate).toLocaleDateString()}
                </span>
                <span className="text-xs font-medium text-amber-700">Pending approval</span>
              </div>
            ))}
            {pendingPolicies.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <FileTextIcon className="w-3.5 h-3.5 text-slate-400" /> Acknowledge policy: {doc.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleAcknowledge(doc.id)}
                  disabled={ackingId === doc.id}
                  className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-2.5 py-1 disabled:opacity-50"
                >
                  {ackingId === doc.id ? 'Saving…' : 'Acknowledge'}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3">
          Expense approvals and e-signatures aren't part of MitraHR yet — this shows your pending leave requests and
          policy acknowledgments instead.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">My Documents</h3>
        {filesLoading ? (
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
                              onClick={() =>
                                token &&
                                filesEmployeeId &&
                                openAuthedFile(token, `/employees/${filesEmployeeId}/documents/${doc.id}/file`)
                              }
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
    </div>
  );
}
