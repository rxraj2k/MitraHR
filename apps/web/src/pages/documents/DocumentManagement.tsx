import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
  COMPANY_DOCUMENT_CATEGORY_THEME,
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  getExpiryStatus,
} from '../../lib/documentCategories';
import {
  createCompanyDocument,
  deleteCompanyDocument,
  deleteEmployeeDocument,
  getAllEmployeeDocuments,
  getCompanyDocuments,
  getEmployees,
  openAuthedFile,
  updateCompanyDocument,
  updateEmployeeDocument,
  uploadEmployeeDocument,
} from '../../lib/api';
import { CompanyDocument, CompanyDocumentCategory, Employee, EmployeeDocumentWithOwner } from '../../types';

type Tab = 'employee' | 'company';
const TABS: TabBarItem<Tab>[] = [
  { key: 'employee', label: 'Employee Documents', color: 'indigo' },
  { key: 'company', label: 'Company Documents', color: 'teal' },
];

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function EmployeeDocumentsTab() {
  const { token } = useAuth();
  const [docs, setDocs] = useState<EmployeeDocumentWithOwner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeFilter, setEmployeeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');

  const [uploadEmployeeId, setUploadEmployeeId] = useState('');
  const [uploadType, setUploadType] = useState('OFFER_LETTER');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState('');
  const [editExpiry, setEditExpiry] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [d, e] = await Promise.all([getAllEmployeeDocuments(token), getEmployees(token)]);
      setDocs(d);
      setEmployees(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!token || !uploadEmployeeId || !uploadFile) return;
    setUploading(true);
    setUploadMessage('');
    try {
      await uploadEmployeeDocument(token, uploadEmployeeId, uploadType, uploadFile, uploadExpiry || undefined);
      setUploadMessage('Uploaded.');
      setUploadEmployeeId('');
      setUploadExpiry('');
      setUploadFile(null);
      setFileInputKey((k) => k + 1);
      load();
    } catch (err: any) {
      setUploadMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  function startEdit(doc: EmployeeDocumentWithOwner) {
    setEditingId(doc.id);
    setEditType(doc.documentType);
    setEditExpiry(doc.expiryDate ? doc.expiryDate.slice(0, 10) : '');
  }

  async function saveEdit(doc: EmployeeDocumentWithOwner) {
    if (!token) return;
    await updateEmployeeDocument(token, doc.employee.id, doc.id, {
      documentType: editType,
      expiryDate: editExpiry || null,
    });
    setEditingId(null);
    load();
  }

  async function handleDelete(doc: EmployeeDocumentWithOwner) {
    if (!token) return;
    if (!confirm(`Delete "${doc.fileName}"? This can't be undone.`)) return;
    await deleteEmployeeDocument(token, doc.employee.id, doc.id);
    load();
  }

  const filtered = docs.filter((d) => {
    if (employeeFilter && d.employee.id !== employeeFilter) return false;
    if (typeFilter && d.documentType !== typeFilter) return false;
    if (expiryFilter && getExpiryStatus(d.expiryDate) !== expiryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload a Document</h2>
        <p className="text-xs text-slate-500 mb-4">
          Attach an offer letter, ID proof, certificate, or contract to an employee's record.
        </p>
        {uploadMessage && <div className="text-sm text-slate-600 mb-3">{uploadMessage}</div>}
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee</label>
            <select
              required
              value={uploadEmployeeId}
              onChange={(e) => setUploadEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Expiry (optional)</label>
            <input
              type="date"
              value={uploadExpiry}
              onChange={(e) => setUploadExpiry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">File</label>
            <input
              key={fileInputKey}
              required
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">All Employee Documents</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">All types</option>
              {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">Any expiry status</option>
              <option value="EXPIRED">Expired</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="VALID">Valid</option>
              <option value="NONE">No Expiry</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500 text-sm">No documents match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Uploaded</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => {
                  const status = getExpiryStatus(doc.expiryDate);
                  const isEditing = editingId === doc.id;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-700">{doc.employee.fullName}</td>
                      <td className="py-2 text-slate-600">
                        {isEditing ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                          doc.documentType
                        )}
                      </td>
                      <td className="py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editExpiry}
                            onChange={(e) => setEditExpiry(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
                            {status === 'NONE'
                              ? EXPIRY_STATUS_LABELS[status]
                              : `${EXPIRY_STATUS_LABELS[status]} · ${formatDate(doc.expiryDate)}`}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-500">{formatDate(doc.uploadedAt)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(doc)} className="text-xs text-emerald-600 hover:underline mr-3">
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                token && openAuthedFile(token, `/employees/${doc.employee.id}/documents/${doc.id}/file`)
                              }
                              className="text-xs text-mitra-accentFrom hover:underline mr-3"
                            >
                              View
                            </button>
                            <button onClick={() => startEdit(doc)} className="text-xs text-slate-500 hover:underline mr-3">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(doc)} className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyDocumentsTab() {
  const { token } = useAuth();
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('POLICY');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editTitle, setEditTitle] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      setDocs(await getCompanyDocuments(token));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!token || !title || !file) return;
    setUploading(true);
    setUploadMessage('');
    try {
      await createCompanyDocument(token, category, title, file);
      setUploadMessage('Uploaded.');
      setTitle('');
      setFile(null);
      setFileInputKey((k) => k + 1);
      load();
    } catch (err: any) {
      setUploadMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  function startEdit(doc: CompanyDocument) {
    setEditingId(doc.id);
    setEditCategory(doc.category);
    setEditTitle(doc.title);
  }

  async function saveEdit(doc: CompanyDocument) {
    if (!token) return;
    await updateCompanyDocument(token, doc.id, { category: editCategory, title: editTitle });
    setEditingId(null);
    load();
  }

  async function handleDelete(doc: CompanyDocument) {
    if (!token) return;
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    await deleteCompanyDocument(token, doc.id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload a Company Document</h2>
        <p className="text-xs text-slate-500 mb-4">Policies, templates, and handbooks — visible to every employee.</p>
        {uploadMessage && <div className="text-sm text-slate-600 mb-3">{uploadMessage}</div>}
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {COMPANY_DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {COMPANY_DOCUMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leave Policy 2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">File</label>
            <input
              key={fileInputKey}
              required
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Company Documents</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : docs.length === 0 ? (
          <p className="text-slate-500 text-sm">No company documents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Uploaded</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc) => {
                  const isEditing = editingId === doc.id;
                  const cat = (doc.category as CompanyDocumentCategory) in COMPANY_DOCUMENT_CATEGORY_LABELS
                    ? (doc.category as CompanyDocumentCategory)
                    : 'OTHER';
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-700">
                        {isEditing ? (
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        ) : (
                          doc.title
                        )}
                      </td>
                      <td className="py-2">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            {COMPANY_DOCUMENT_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {COMPANY_DOCUMENT_CATEGORY_LABELS[c]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${COMPANY_DOCUMENT_CATEGORY_THEME[cat]}`}>
                            {COMPANY_DOCUMENT_CATEGORY_LABELS[cat]}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-500">{formatDate(doc.uploadedAt)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(doc)} className="text-xs text-emerald-600 hover:underline mr-3">
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:underline">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => token && openAuthedFile(token, `/company-documents/${doc.id}/file`)}
                              className="text-xs text-mitra-accentFrom hover:underline mr-3"
                            >
                              View
                            </button>
                            <button onClick={() => startEdit(doc)} className="text-xs text-slate-500 hover:underline mr-3">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(doc)} className="text-xs text-red-500 hover:underline">
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentManagement() {
  const [tab, setTab] = useState<Tab>('employee');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Document Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Employee records and company-wide policies, in one place — with expiry tracked automatically.
        </p>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'employee' && <EmployeeDocumentsTab />}
      {tab === 'company' && <CompanyDocumentsTab />}
    </div>
  );
}
