import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/Avatar';
import { acknowledgeCompanyDocument, getCompanyDocumentAcknowledgments, getCompanyDocuments, openAuthedFile } from '../../lib/api';
import { CompanyDocument, CompanyDocumentAcknowledgmentStatus } from '../../types';
import { FileTextIcon } from '../../components/icons';

function PolicyAcknowledgmentModal({ token, doc, onClose }: { token: string; doc: CompanyDocument; onClose: () => void }) {
  const [status, setStatus] = useState<CompanyDocumentAcknowledgmentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyDocumentAcknowledgments(token, doc.id)
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [token, doc.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
            <p className="text-xs text-slate-400">Policy acknowledgment status</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            Close
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : status ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Acknowledged ({status.acknowledged.length})</p>
              {status.acknowledged.length === 0 ? (
                <p className="text-xs text-slate-400">No one yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {status.acknowledged.map((a) => (
                    <li key={a.employee.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Avatar name={a.employee.fullName} photoUrl={a.employee.photoUrl} size="sm" />
                        <span className="text-slate-700">{a.employee.fullName}</span>
                      </span>
                      <span className="text-xs text-slate-400">{new Date(a.acknowledgedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Pending ({status.pending.length})</p>
              {status.pending.length === 0 ? (
                <p className="text-xs text-emerald-600">Everyone has acknowledged this policy.</p>
              ) : (
                <ul className="space-y-1.5">
                  {status.pending.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sm">
                      <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                      <span className="text-slate-700">{e.fullName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-500">Failed to load status.</p>
        )}
      </div>
    </div>
  );
}

// The old Organization page's "Policies" tab, now its own route
// (/organization/policies).
export default function OrganizationPolicies() {
  const { token, isStaff } = useAuth();
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState<string | null>(null);
  const [statusDoc, setStatusDoc] = useState<CompanyDocument | null>(null);

  function load() {
    if (!token) return;
    getCompanyDocuments(token)
      .then(setDocs)
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  async function handleAcknowledge(id: string) {
    if (!token) return;
    setAcking(id);
    try {
      await acknowledgeCompanyDocument(token, id);
      load();
    } finally {
      setAcking(null);
    }
  }

  if (!token || loading) return <p className="text-sm text-slate-400">Loading policies…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Policies</h1>
        <p className="text-sm text-slate-500 mt-1">
          Company policies, templates, and handbooks. Manage the full set from{' '}
          <Link to="/documents" className="text-mitra-accentFrom hover:underline">
            Document Management
          </Link>
          .
        </p>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-400">No company documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map((d) => {
            const isPolicy = d.category === 'POLICY';
            return (
              <div key={d.id} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-mitra-accentFrom/40">
                <button
                  type="button"
                  onClick={() => openAuthedFile(token, `/company-documents/${d.id}/file`)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <FileTextIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.category} · Updated {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                {isPolicy && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {d.acknowledgedByMe ? (
                      <span className="text-xs font-medium text-emerald-600">✓ Acknowledged</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(d.id)}
                        disabled={acking === d.id}
                        className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-2.5 py-1 disabled:opacity-50"
                      >
                        {acking === d.id ? 'Saving…' : 'Acknowledge'}
                      </button>
                    )}
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => setStatusDoc(d)}
                        className="text-xs text-slate-500 hover:text-mitra-accentFrom hover:underline"
                      >
                        {d.acknowledgedCount ?? 0}/{d.eligibleCount ?? 0} acknowledged
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {statusDoc && token && <PolicyAcknowledgmentModal token={token} doc={statusDoc} onClose={() => setStatusDoc(null)} />}
    </div>
  );
}
