import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  ExpiryStatus,
  FILE_KIND_THEME,
  MAX_UPLOAD_SIZE_MB,
  formatFileSize,
  getExpiryStatus,
  getFileExt,
  getFileKind,
} from '../../lib/documentCategories';
import {
  createCompanyDocument,
  deleteCompanyDocument,
  deleteEmployeeDocument,
  downloadAuthedFile,
  fetchAuthedFileBlob,
  getAllEmployeeDocuments,
  getCompanyDocumentAcknowledgments,
  getCompanyDocuments,
  getEmployees,
  updateCompanyDocument,
  updateEmployeeDocument,
  uploadEmployeeDocument,
} from '../../lib/api';
import {
  CompanyDocument,
  CompanyDocumentAcknowledgmentStatus,
  CompanyDocumentCategory,
  Employee,
  EmployeeDocumentWithOwner,
} from '../../types';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  NotebookIcon,
  PencilIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from '../../components/icons';
import { Avatar } from '../../components/Avatar';
import { EmployeePicker } from '../../components/EmployeePicker';
import MetricTile from '../../components/MetricTile';
import Progress3DBar from '../../components/Progress3DBar';
import { TILE_THEME_BY_NAME, tileWrapperClass } from '../../lib/tileThemes';
import { PRIMARY_BUTTON_3D } from '../../lib/buttonStyles';

type Tab = 'employee' | 'company';
const TABS: TabBarItem<Tab>[] = [
  { key: 'employee', label: 'Employee Documents', color: 'indigo' },
  { key: 'company', label: 'Company Documents', color: 'teal' },
];

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- Small shared bits used by both tabs ---

// A colored monogram chip standing in for a real PDF/Word/Image icon — no
// dedicated file-type SVGs in the app yet, so the extension itself, on a
// kind-coded background, carries the same "what is this" signal.
function FileTypeChip({ fileName, size = 'sm' }: { fileName: string; size?: 'sm' | 'lg' }) {
  const kind = getFileKind(fileName);
  const ext = getFileExt(fileName) || '?';
  const theme = FILE_KIND_THEME[kind];
  const dim = size === 'lg' ? 'w-12 h-12 text-[11px]' : 'w-8 h-8 text-[9px]';
  return (
    <span className={`inline-flex items-center justify-center rounded-lg font-bold flex-shrink-0 ${dim} ${theme}`}>
      {ext.slice(0, 4)}
    </span>
  );
}

// Expiry badge with a pulse dot for anything that needs attention — a
// still badge for "Expired" or "Expiring Soon" is easy to miss in a long
// table, the pulse is what actually draws the eye.
function ExpiryBadge({ date }: { date?: string | null }) {
  const status = getExpiryStatus(date);
  const pulseColor = status === 'EXPIRED' ? 'bg-red-500' : status === 'EXPIRING_SOON' ? 'bg-amber-500' : null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
      {pulseColor && <span className={`w-1.5 h-1.5 rounded-full ${pulseColor} animate-pulse`} />}
      {status === 'NONE' ? EXPIRY_STATUS_LABELS[status] : `${EXPIRY_STATUS_LABELS[status]} · ${formatDate(date)}`}
    </span>
  );
}

const PILL_TONE = {
  slate: 'text-slate-500 bg-slate-100 hover:bg-slate-200',
  indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
  emerald: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
  red: 'text-red-500 bg-red-50 hover:bg-red-100',
} as const;

// A hover-only icon-pill row action — Quick Preview / Download / Edit /
// Delete all use this, styled by "tone" rather than each hand-rolling its
// own color combination.
function IconPillButton({
  icon: Icon,
  onClick,
  title,
  tone,
  disabled,
}: {
  icon: (props: { className?: string }) => JSX.Element;
  onClick: () => void;
  title: string;
  tone: keyof typeof PILL_TONE;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${PILL_TONE[tone]}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// Drag-and-drop upload zone with client-side type/size validation — backs
// both drawers' "File" section. The server enforces the same allowlist and
// 10MB cap independently; this is just a faster no-round-trip check.
function FileDropzone({ file, onFileChange }: { file: File | null; onFileChange: (file: File | null) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    const f = fileList?.[0];
    if (!f) return;
    const ext = getFileExt(f.name);
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext)) {
      setLocalError(`.${ext.toLowerCase() || '?'} isn't supported — use ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}.`);
      return;
    }
    if (f.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      setLocalError(`That file is larger than the ${MAX_UPLOAD_SIZE_MB}MB limit.`);
      return;
    }
    setLocalError('');
    onFileChange(f);
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <FileTypeChip fileName={file.name} />
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate max-w-[220px]">{file.name}</p>
              <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
            </div>
            <button type="button" onClick={() => onFileChange(null)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadIcon className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Drag &amp; drop a file here, or click to browse</p>
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              {ALLOWED_UPLOAD_EXTENSIONS.map((ext) => (
                <span
                  key={ext}
                  className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5"
                >
                  {ext}
                </span>
              ))}
              <span className="text-[10px] text-slate-400">· max {MAX_UPLOAD_SIZE_MB}MB</span>
            </div>
          </>
        )}
      </div>
      {localError && <p className="text-xs text-red-600 mt-1.5">{localError}</p>}
    </div>
  );
}

// Inline PDF/image preview drawer — fetches the file's bytes through the
// authenticated route and renders them without leaving the page. Anything
// that can't be rendered inline (Word docs) falls back to a "download to
// view" message instead of a blank iframe.
function DocumentPreviewDrawer({
  token,
  fetchPath,
  fileName,
  title,
  meta,
  onClose,
}: {
  token: string | null;
  fetchPath: string;
  fileName: string;
  title: string;
  meta: { label: string; value: string }[];
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const kind = getFileKind(fileName);

  useEffect(() => {
    if (!token) return;
    let currentUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchAuthedFileBlob(token, fetchPath)
      .then((blob) => {
        if (cancelled) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [token, fetchPath]);

  async function handleDownload() {
    if (!token) return;
    try {
      await downloadAuthedFile(token, fetchPath, fileName);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 truncate">{title}</h2>
            <p className="text-xs text-slate-400 truncate mt-0.5">{fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs">
          {meta.map((m) => (
            <div key={m.label}>
              <span className="text-slate-400">{m.label}: </span>
              <span className="text-slate-600 font-medium">{m.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Loading preview...</p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : kind === 'image' && blobUrl ? (
            <img src={blobUrl} alt={fileName} className="max-w-full max-h-full rounded-lg shadow-lg" />
          ) : kind === 'pdf' && blobUrl ? (
            <iframe title={fileName} src={blobUrl} className="w-full h-full rounded-lg bg-white shadow-lg" />
          ) : (
            <div className="text-center text-sm text-slate-500">
              <FileTypeChip fileName={fileName} size="lg" />
              <p className="mt-3">Preview isn't available for this file type — download it to view.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button type="button" onClick={handleDownload} className={`w-full rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
            Download File
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Employee Documents tab ---

interface EmployeeDocForm {
  employeeId: string;
  documentType: string;
  expiryDate: string;
  notes: string;
  file: File | null;
}
const EMPTY_EMPLOYEE_DOC_FORM: EmployeeDocForm = {
  employeeId: '',
  documentType: 'OFFER_LETTER',
  expiryDate: '',
  notes: '',
  file: null,
};

function EmployeeDocumentDrawer({
  mode,
  form,
  employees,
  saving,
  progress,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: EmployeeDocForm;
  employees: Employee[];
  saving: boolean;
  progress: number | null;
  error: string;
  onChange: (patch: Partial<EmployeeDocForm>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  const selectedEmployee = employees.find((e) => e.id === form.employeeId);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">{mode === 'edit' ? 'Edit Document' : 'Upload a Document'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Document Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Employee</label>
                {mode === 'edit' ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <Avatar name={selectedEmployee?.fullName || '—'} photoUrl={selectedEmployee?.photoUrl} size="sm" />
                    <span className="text-sm text-slate-600">{selectedEmployee?.fullName || '—'}</span>
                  </div>
                ) : (
                  <EmployeePicker employees={employees} value={form.employeeId} onChange={(id) => onChange({ employeeId: id })} />
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Document Category</label>
                <select
                  value={form.documentType}
                  onChange={(e) => onChange({ documentType: e.target.value })}
                  className={inputClass}
                >
                  {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => onChange({ expiryDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  placeholder="Anything worth flagging about this document"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {mode === 'add' && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">File</h3>
              <FileDropzone file={form.file} onFileChange={(file) => onChange({ file })} />
              {progress !== null && (
                <div className="mt-3">
                  <Progress3DBar percent={progress} fillClassName="bg-gradient-to-r from-indigo-400 to-indigo-600" />
                  <p className="text-[11px] text-slate-400 mt-1">{progress}% uploaded</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg text-sm font-medium px-4 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Upload Document'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeDocumentsTab({
  docs,
  employees,
  loading,
  onChanged,
  expiryFilter,
  onExpiryFilterChange,
}: {
  docs: EmployeeDocumentWithOwner[];
  employees: Employee[];
  loading: boolean;
  onChanged: () => void;
  expiryFilter: string;
  onExpiryFilterChange: (v: string) => void;
}) {
  const { token } = useAuth();
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [drawer, setDrawer] = useState<{ mode: 'add' | 'edit'; id?: string; employeeId?: string; form: EmployeeDocForm } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [preview, setPreview] = useState<{ fetchPath: string; fileName: string; title: string; meta: { label: string; value: string }[] } | null>(
    null,
  );

  function startAdd() {
    setError('');
    setDrawer({ mode: 'add', form: EMPTY_EMPLOYEE_DOC_FORM });
  }

  function startEdit(doc: EmployeeDocumentWithOwner) {
    setError('');
    setDrawer({
      mode: 'edit',
      id: doc.id,
      employeeId: doc.employee.id,
      form: {
        employeeId: doc.employee.id,
        documentType: doc.documentType,
        expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '',
        notes: doc.notes || '',
        file: null,
      },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !drawer) return;
    if (drawer.mode === 'add' && (!drawer.form.employeeId || !drawer.form.file)) {
      setError('Pick an employee and a file first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (drawer.mode === 'edit' && drawer.id && drawer.employeeId) {
        await updateEmployeeDocument(token, drawer.employeeId, drawer.id, {
          documentType: drawer.form.documentType,
          expiryDate: drawer.form.expiryDate || null,
          notes: drawer.form.notes || null,
        });
      } else if (drawer.form.file) {
        setProgress(0);
        await uploadEmployeeDocument(
          token,
          drawer.form.employeeId,
          drawer.form.documentType,
          drawer.form.file,
          drawer.form.expiryDate || undefined,
          drawer.form.notes || undefined,
          setProgress,
        );
      }
      setDrawer(null);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function handleDelete(doc: EmployeeDocumentWithOwner) {
    if (!token) return;
    if (!confirm(`Delete "${doc.fileName}"? This can't be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await deleteEmployeeDocument(token, doc.employee.id, doc.id);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(doc: EmployeeDocumentWithOwner) {
    if (!token) return;
    try {
      await downloadAuthedFile(token, `/employees/${doc.employee.id}/documents/${doc.id}/file`, doc.fileName);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openPreview(doc: EmployeeDocumentWithOwner) {
    setPreview({
      fetchPath: `/employees/${doc.employee.id}/documents/${doc.id}/file`,
      fileName: doc.fileName,
      title: EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] || doc.documentType,
      meta: [
        { label: 'Employee', value: doc.employee.fullName },
        { label: 'Uploaded', value: formatDate(doc.uploadedAt) },
        { label: 'Expiry', value: doc.expiryDate ? formatDate(doc.expiryDate) : 'No expiry' },
      ],
    });
  }

  const searchQuery = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (employeeFilter && d.employee.id !== employeeFilter) return false;
    if (typeFilter && d.documentType !== typeFilter) return false;
    if (expiryFilter && getExpiryStatus(d.expiryDate) !== expiryFilter) return false;
    if (!searchQuery) return true;
    return (
      d.employee.fullName.toLowerCase().includes(searchQuery) ||
      d.fileName.toLowerCase().includes(searchQuery) ||
      (EMPLOYEE_DOCUMENT_TYPE_LABELS[d.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] || d.documentType)
        .toLowerCase()
        .includes(searchQuery)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Offer letters, ID proofs, certificates, contracts — attached to each employee's record.</p>
        <button type="button" onClick={startAdd} className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
          + Upload Document
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {drawer && (
        <EmployeeDocumentDrawer
          mode={drawer.mode}
          form={drawer.form}
          employees={employees}
          saving={saving}
          progress={progress}
          error={error}
          onChange={(patch) => setDrawer((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d))}
          onSubmit={handleSubmit}
          onClose={() => setDrawer(null)}
        />
      )}

      {preview && <DocumentPreviewDrawer token={token} {...preview} onClose={() => setPreview(null)} />}

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, file, or category..."
              className={`${inputClass} pl-9`}
            />
          </div>
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
            <option value="">All categories</option>
            {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {expiryFilter && (
            <button
              type="button"
              onClick={() => onExpiryFilterChange('')}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full pl-3 pr-2 py-1.5 hover:bg-indigo-100"
            >
              {EXPIRY_STATUS_LABELS[expiryFilter as ExpiryStatus]}
              <XIcon className="w-3 h-3" />
            </button>
          )}
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
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Document</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Uploaded</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-slate-50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={doc.employee.fullName} photoUrl={doc.employee.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 truncate">{doc.employee.fullName}</p>
                          {doc.employee.designation?.name && (
                            <p className="text-[11px] text-slate-400 truncate">{doc.employee.designation.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-block font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                        {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] || doc.documentType}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <FileTypeChip fileName={doc.fileName} />
                        <div className="min-w-0">
                          <p className="text-slate-700 truncate max-w-[180px]">{doc.fileName}</p>
                          <p className="text-[11px] text-slate-400">{formatFileSize(doc.fileSize)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <ExpiryBadge date={doc.expiryDate} />
                    </td>
                    <td className="py-2.5 text-slate-500">{formatDate(doc.uploadedAt)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <IconPillButton icon={EyeIcon} title="Quick Preview" tone="indigo" onClick={() => openPreview(doc)} />
                        <IconPillButton icon={DownloadIcon} title="Download" tone="slate" onClick={() => handleDownload(doc)} />
                        <IconPillButton icon={PencilIcon} title="Edit" tone="slate" onClick={() => startEdit(doc)} />
                        <IconPillButton
                          icon={TrashIcon}
                          title="Delete"
                          tone="red"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Company Documents tab ---

interface CompanyDocForm {
  title: string;
  category: string;
  description: string;
  requiresAcknowledgment: boolean;
  file: File | null;
}
const EMPTY_COMPANY_DOC_FORM: CompanyDocForm = {
  title: '',
  category: 'POLICY',
  description: '',
  requiresAcknowledgment: true,
  file: null,
};

const CATEGORY_ICON: Record<CompanyDocumentCategory, (props: { className?: string }) => JSX.Element> = {
  POLICY: ShieldIcon,
  HANDBOOK: NotebookIcon,
  TEMPLATE: ClipboardListIcon,
  OTHER: FolderIcon,
};
const CATEGORY_TILE_THEME: Record<CompanyDocumentCategory, (typeof TILE_THEME_BY_NAME)[keyof typeof TILE_THEME_BY_NAME]> = {
  POLICY: TILE_THEME_BY_NAME.indigo,
  HANDBOOK: TILE_THEME_BY_NAME.teal,
  TEMPLATE: TILE_THEME_BY_NAME.sky,
  OTHER: TILE_THEME_BY_NAME.slate,
};

function normalizeCategory(category: string): CompanyDocumentCategory {
  return (COMPANY_DOCUMENT_CATEGORIES as string[]).includes(category) ? (category as CompanyDocumentCategory) : 'OTHER';
}

function CompanyDocumentDrawer({
  mode,
  form,
  saving,
  progress,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: 'add' | 'edit';
  form: CompanyDocForm;
  saving: boolean;
  progress: number | null;
  error: string;
  onChange: (patch: Partial<CompanyDocForm>) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">{mode === 'edit' ? 'Edit Company Document' : 'Upload a Company Document'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-8">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Document Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="e.g. Leave Policy 2026"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category</label>
                <select value={form.category} onChange={(e) => onChange({ category: e.target.value })} className={inputClass}>
                  {COMPANY_DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {COMPANY_DOCUMENT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description (optional)</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder="A line or two describing what this document covers"
                  className={inputClass}
                />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresAcknowledgment}
                  onChange={(e) => onChange({ requiresAcknowledgment: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-mitra-accentFrom focus:ring-mitra-accentFrom"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-700">Require Employee E-Signature / Acknowledgment</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Employees will need to confirm they've read this before it counts as signed off. Good for policies and handbooks.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {mode === 'add' && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">File</h3>
              <FileDropzone file={form.file} onFileChange={(file) => onChange({ file })} />
              {progress !== null && (
                <div className="mt-3">
                  <Progress3DBar percent={progress} fillClassName="bg-gradient-to-r from-teal-400 to-emerald-600" />
                  <p className="text-[11px] text-slate-400 mt-1">{progress}% uploaded</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg text-sm font-medium px-4 py-2 disabled:opacity-50 ${PRIMARY_BUTTON_3D}`}
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Upload Document'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Staff-only compliance breakdown for one acknowledgment-required document —
// who's signed, who hasn't, backed by the existing (previously unused in
// the UI) GET /company-documents/:id/acknowledgments endpoint.
function AcknowledgmentStatusDrawer({ token, doc, onClose }: { token: string | null; doc: CompanyDocument; onClose: () => void }) {
  const [status, setStatus] = useState<CompanyDocumentAcknowledgmentStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    getCompanyDocumentAcknowledgments(token, doc.id)
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, [token, doc.id]);

  const eligible = doc.eligibleCount || 0;
  const acknowledged = doc.acknowledgedCount || 0;
  const pct = eligible ? Math.round((acknowledged / eligible) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-800">Acknowledgment Status</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{doc.title}</p>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-600">
              {acknowledged} of {eligible} signed
            </span>
            <span className="text-slate-400">{pct}%</span>
          </div>
          <Progress3DBar percent={pct} fillClassName="bg-gradient-to-r from-emerald-400 to-teal-500" />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {!status ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Signed ({status.acknowledged.length})</h3>
              {status.acknowledged.length === 0 ? (
                <p className="text-xs text-slate-400">No one yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {status.acknowledged.map((a) => (
                    <div key={a.employee.id} className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={a.employee.fullName} photoUrl={a.employee.photoUrl} size="sm" />
                        <span className="text-sm text-slate-700 truncate">{a.employee.fullName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(a.acknowledgedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Pending ({status.pending.length})</h3>
              {status.pending.length === 0 ? (
                <p className="text-xs text-emerald-600">Everyone has signed.</p>
              ) : (
                <div className="space-y-1.5">
                  {status.pending.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 py-1">
                      <Avatar name={e.fullName} photoUrl={e.photoUrl} size="sm" />
                      <span className="text-sm text-slate-700 truncate">{e.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyDocCard({
  doc,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onViewSigners,
}: {
  doc: CompanyDocument;
  onPreview: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewSigners: () => void;
}) {
  const eligible = doc.eligibleCount || 0;
  const acknowledged = doc.acknowledgedCount || 0;
  const pct = eligible ? Math.round((acknowledged / eligible) * 100) : 0;

  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 p-5">
      <div className="flex items-start gap-3">
        <FileTypeChip fileName={doc.fileName} size="lg" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-800 truncate">{doc.title}</h4>
          {doc.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{doc.description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-3">
        <span>{formatDate(doc.uploadedAt)}</span>
        <span>·</span>
        <span>{formatFileSize(doc.fileSize)}</span>
      </div>

      {doc.requiresAcknowledgment && (
        <button type="button" onClick={onViewSigners} className="w-full mt-3 text-left">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
              {acknowledged}/{eligible} Signed
            </span>
            <span className="text-indigo-600 font-medium">View →</span>
          </div>
          <Progress3DBar
            percent={pct}
            height="h-1.5"
            fillClassName={pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}
          />
        </button>
      )}

      <div className="flex items-center justify-end gap-1 mt-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconPillButton icon={EyeIcon} title="Quick Preview" tone="indigo" onClick={onPreview} />
        <IconPillButton icon={DownloadIcon} title="Download" tone="slate" onClick={onDownload} />
        <IconPillButton icon={PencilIcon} title="Edit" tone="slate" onClick={onEdit} />
        <IconPillButton icon={TrashIcon} title="Delete" tone="red" onClick={onDelete} />
      </div>
    </div>
  );
}

function CompanyDocumentsTab({
  docs,
  loading,
  onChanged,
  pendingOnly,
  onPendingOnlyChange,
}: {
  docs: CompanyDocument[];
  loading: boolean;
  onChanged: () => void;
  pendingOnly: boolean;
  onPendingOnlyChange: (v: boolean) => void;
}) {
  const { token } = useAuth();
  const [drawer, setDrawer] = useState<{ mode: 'add' | 'edit'; id?: string; form: CompanyDocForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [signersDoc, setSignersDoc] = useState<CompanyDocument | null>(null);
  const [preview, setPreview] = useState<{ fetchPath: string; fileName: string; title: string; meta: { label: string; value: string }[] } | null>(
    null,
  );

  function startAdd() {
    setError('');
    setDrawer({ mode: 'add', form: EMPTY_COMPANY_DOC_FORM });
  }

  function startEdit(doc: CompanyDocument) {
    setError('');
    setDrawer({
      mode: 'edit',
      id: doc.id,
      form: {
        title: doc.title,
        category: normalizeCategory(doc.category),
        description: doc.description || '',
        requiresAcknowledgment: doc.requiresAcknowledgment,
        file: null,
      },
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !drawer) return;
    if (drawer.mode === 'add' && !drawer.form.file) {
      setError('Choose a file to upload.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (drawer.mode === 'edit' && drawer.id) {
        await updateCompanyDocument(token, drawer.id, {
          category: drawer.form.category,
          title: drawer.form.title.trim(),
          description: drawer.form.description.trim(),
          requiresAcknowledgment: drawer.form.requiresAcknowledgment,
        });
      } else if (drawer.form.file) {
        setProgress(0);
        await createCompanyDocument(
          token,
          drawer.form.category,
          drawer.form.title.trim(),
          drawer.form.file,
          drawer.form.requiresAcknowledgment,
          drawer.form.description.trim() || undefined,
          setProgress,
        );
      }
      setDrawer(null);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  async function handleDelete(doc: CompanyDocument) {
    if (!token) return;
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      await deleteCompanyDocument(token, doc.id);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDownload(doc: CompanyDocument) {
    if (!token) return;
    try {
      await downloadAuthedFile(token, `/company-documents/${doc.id}/file`, doc.fileName);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openPreview(doc: CompanyDocument) {
    setPreview({
      fetchPath: `/company-documents/${doc.id}/file`,
      fileName: doc.fileName,
      title: doc.title,
      meta: [
        { label: 'Category', value: COMPANY_DOCUMENT_CATEGORY_LABELS[normalizeCategory(doc.category)] },
        { label: 'Uploaded', value: formatDate(doc.uploadedAt) },
        { label: 'Size', value: formatFileSize(doc.fileSize) },
      ],
    });
  }

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const visible = pendingOnly ? docs.filter((d) => d.requiresAcknowledgment && (d.acknowledgedCount || 0) < (d.eligibleCount || 0)) : docs;
  const grouped = COMPANY_DOCUMENT_CATEGORIES.map((cat) => ({
    category: cat,
    items: visible.filter((d) => normalizeCategory(d.category) === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Policies, templates, and handbooks — visible to every employee.</p>
        <button type="button" onClick={startAdd} className={`rounded-lg text-sm font-medium px-4 py-2 ${PRIMARY_BUTTON_3D}`}>
          + Upload Document
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {drawer && (
        <CompanyDocumentDrawer
          mode={drawer.mode}
          form={drawer.form}
          saving={saving}
          progress={progress}
          error={error}
          onChange={(patch) => setDrawer((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d))}
          onSubmit={handleSubmit}
          onClose={() => setDrawer(null)}
        />
      )}

      {signersDoc && <AcknowledgmentStatusDrawer token={token} doc={signersDoc} onClose={() => setSignersDoc(null)} />}
      {preview && <DocumentPreviewDrawer token={token} {...preview} onClose={() => setPreview(null)} />}

      {pendingOnly && (
        <button
          type="button"
          onClick={() => onPendingOnlyChange(false)}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full pl-3 pr-2 py-1.5 hover:bg-violet-100"
        >
          Pending Signatures only
          <XIcon className="w-3 h-3" />
        </button>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">No company documents match.</div>
      ) : (
        grouped.map(({ category, items }) => {
          const Icon = CATEGORY_ICON[category];
          const theme = CATEGORY_TILE_THEME[category];
          const collapsed = collapsedCategories.has(category);
          return (
            <div key={category}>
              <button type="button" onClick={() => toggleCategory(category)} className="w-full flex items-center gap-2 mb-3 text-left">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${theme.tileBg}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-semibold text-slate-700">{COMPANY_DOCUMENT_CATEGORY_LABELS[category]}</h3>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">{items.length}</span>
                <ChevronDownIcon className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`} />
              </button>
              {!collapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {items.map((doc) => (
                    <CompanyDocCard
                      key={doc.id}
                      doc={doc}
                      onPreview={() => openPreview(doc)}
                      onDownload={() => handleDownload(doc)}
                      onEdit={() => startEdit(doc)}
                      onDelete={() => handleDelete(doc)}
                      onViewSigners={() => setSignersDoc(doc)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// --- Top level ---

const KPI_TILE_ICON = {
  total: FileTextIcon,
  expiring: ClockIcon,
  expired: AlertTriangleIcon,
  pending: ClipboardListIcon,
} as const;
const KPI_TILE_THEME = {
  total: TILE_THEME_BY_NAME.indigo,
  expiring: TILE_THEME_BY_NAME.amber,
  expired: TILE_THEME_BY_NAME.rose,
  pending: TILE_THEME_BY_NAME.violet,
} as const;

export default function DocumentManagement() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('employee');
  const [docs, setDocs] = useState<EmployeeDocumentWithOwner[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyDocs, setCompanyDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiryFilter, setExpiryFilter] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([getAllEmployeeDocuments(token), getEmployees(token), getCompanyDocuments(token)])
      .then(([d, e, c]) => {
        setDocs(d);
        setEmployees(e);
        setCompanyDocs(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const totalDocuments = docs.length + companyDocs.length;
  const expiringSoonCount = docs.filter((d) => getExpiryStatus(d.expiryDate) === 'EXPIRING_SOON').length;
  const expiredCount = docs.filter((d) => getExpiryStatus(d.expiryDate) === 'EXPIRED').length;
  const pendingSignatures = companyDocs
    .filter((d) => d.requiresAcknowledgment)
    .reduce((sum, d) => sum + Math.max(0, (d.eligibleCount || 0) - (d.acknowledgedCount || 0)), 0);

  const tiles: { key: keyof typeof KPI_TILE_ICON; label: string; value: number; active: boolean }[] = [
    { key: 'total', label: 'Total Documents', value: totalDocuments, active: !expiryFilter && !pendingOnly },
    { key: 'expiring', label: 'Expiring Soon', value: expiringSoonCount, active: expiryFilter === 'EXPIRING_SOON' },
    { key: 'expired', label: 'Expired Documents', value: expiredCount, active: expiryFilter === 'EXPIRED' },
    { key: 'pending', label: 'Pending Signatures', value: pendingSignatures, active: pendingOnly },
  ];

  function handleTileClick(key: keyof typeof KPI_TILE_ICON) {
    if (key === 'total') {
      setExpiryFilter('');
      setPendingOnly(false);
    } else if (key === 'expiring') {
      setTab('employee');
      setPendingOnly(false);
      setExpiryFilter((f) => (f === 'EXPIRING_SOON' ? '' : 'EXPIRING_SOON'));
    } else if (key === 'expired') {
      setTab('employee');
      setPendingOnly(false);
      setExpiryFilter((f) => (f === 'EXPIRED' ? '' : 'EXPIRED'));
    } else if (key === 'pending') {
      setTab('company');
      setExpiryFilter('');
      setPendingOnly((p) => !p);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Document Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Employee records and company-wide policies, in one place — with expiry and sign-off tracked automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => {
          const Icon = KPI_TILE_ICON[tile.key];
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => handleTileClick(tile.key)}
              title="Click to filter the documents below"
              className={`relative overflow-hidden ${tileWrapperClass(KPI_TILE_THEME[tile.key], { active: tile.active })}`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent" />
              <div className="relative">
                <MetricTile icon={Icon} label={tile.label} value={tile.value} />
              </div>
            </button>
          );
        })}
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'employee' && (
        <EmployeeDocumentsTab
          docs={docs}
          employees={employees}
          loading={loading}
          onChanged={load}
          expiryFilter={expiryFilter}
          onExpiryFilterChange={setExpiryFilter}
        />
      )}
      {tab === 'company' && (
        <CompanyDocumentsTab docs={companyDocs} loading={loading} onChanged={load} pendingOnly={pendingOnly} onPendingOnlyChange={setPendingOnly} />
      )}
    </div>
  );
}
