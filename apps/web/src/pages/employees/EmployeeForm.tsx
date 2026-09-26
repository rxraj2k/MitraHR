import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  API_BASE,
  createEmployee,
  deleteEmployee,
  deleteEmployeeDocument,
  getDepartments,
  getDesignationHistory,
  getDesignations,
  getEmployee,
  getEmployees,
  getSkills,
  getWorkLocations,
  openAuthedFile,
  replaceEmployeeSkills,
  updateEmployee,
  uploadEmployeeDocument,
  uploadEmployeePhoto,
} from '../../lib/api';
import { DesignationHistoryEntry, Employee, EmployeeInput, EmployeeSkillEntry, LookupItem } from '../../types';
import SearchableSelect from '../../components/SearchableSelect';
import {
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  getExpiryStatus,
} from '../../lib/documentCategories';
import { DEPLOYMENT_STATUSES, DEPLOYMENT_STATUS_LABELS, EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS } from '../../lib/talentDirectory';

// Employee photos land straight in the header avatar (44px) and the
// profile dropdown (64px) via <Avatar object-cover>, so a source photo
// with an odd aspect ratio (a phone portrait shot, a wide screenshot)
// gets center-cropped by the browser and can end up showing very few of
// its pixels -- which reads as "blurry / stretched" even though nothing
// is technically being upscaled. Cropping to a square client-side, at a
// fixed high-quality target size, up front means every stored photo is
// already framed correctly and never depends on whatever aspect ratio
// the user happened to upload.
const AVATAR_TARGET_PX = 480;
const AVATAR_MIN_SOURCE_PX = 200;

async function processPhotoFile(file: File): Promise<{ file: File; lowResWarning: boolean }> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') {
    return { file, lowResWarning: false };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    // Portrait photos (phone selfies, mostly) tend to have the face in the
    // upper half -- bias the crop up rather than dead-center so it isn't
    // cut off in the square result.
    const sy = height > width ? Math.max(0, (height - side) * 0.2) : (height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_TARGET_PX;
    canvas.height = AVATAR_TARGET_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, lowResWarning: false };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_TARGET_PX, AVATAR_TARGET_PX);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return { file, lowResWarning: false };
    const processed = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    return { file: processed, lowResWarning: side < AVATAR_MIN_SOURCE_PX };
  } catch {
    // Any decode failure (unsupported format, corrupt file) -- fall back
    // to uploading exactly what the user picked rather than blocking them.
    return { file, lowResWarning: false };
  }
}

const EMPTY: EmployeeInput = {
  fullName: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  address: '',
  employmentType: 'FULL_TIME',
  departmentId: '',
  designationId: '',
  team: '',
  workLocation: '',
  reportingManagerId: '',
  systemRole: '',
  experienceLevel: 'MID',
  deploymentStatus: 'BENCH',
  dateOfJoining: '',
  dateOfBirth: '',
};

interface PendingDocument {
  documentType: string;
  file: File;
  expiryDate: string;
}

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  // Roles & Permissions (minimal, Sprint 19 follow-up): only Admin/HR staff
  // may change these two Talent Directory fields — enforced for real on the
  // backend (EmployeesController.assertCanEditTalentDirectoryFields); this
  // just disables the controls so a Manager/IT Support account isn't
  // shown a control that would 403 on save.
  const canEditTalentFields = user?.role === 'ADMIN' || user?.role === 'HR';
  const [form, setForm] = useState<EmployeeInput>(EMPTY);
  const [status, setStatus] = useState('ACTIVE');
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [skills, setSkills] = useState<LookupItem[]>([]);
  const [workLocations, setWorkLocations] = useState<LookupItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLowRes, setPhotoLowRes] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [skillRows, setSkillRows] = useState<EmployeeSkillEntry[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<Employee['documents']>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [newDocType, setNewDocType] = useState<string>(EMPLOYEE_DOCUMENT_TYPES[0]);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [designationHistory, setDesignationHistory] = useState<DesignationHistoryEntry[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([getDepartments(token), getDesignations(token), getSkills(token), getEmployees(token), getWorkLocations(token)])
      .then(([depts, desigs, sk, emps, locs]) => {
        setDepartments(depts);
        setDesignations(desigs);
        setSkills(sk);
        setAllEmployees(emps);
        setWorkLocations(locs);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    getDesignationHistory(token, id)
      .then(setDesignationHistory)
      .catch(() => {});
  }, [isEdit, token, id]);

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    getEmployee(token, id)
      .then((emp) => {
        setForm({
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone || '',
          emergencyContactName: emp.emergencyContactName || '',
          emergencyContactPhone: emp.emergencyContactPhone || '',
          address: emp.address || '',
          employmentType: emp.employmentType,
          departmentId: emp.departmentId || '',
          designationId: emp.designationId || '',
          team: emp.team || '',
          workLocation: emp.workLocation || '',
          reportingManagerId: emp.reportingManagerId || '',
          systemRole: emp.systemRole || '',
          experienceLevel: emp.experienceLevel,
          deploymentStatus: emp.deploymentStatus,
          dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : '',
          dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
        });
        setStatus(emp.status);
        setEmployeeCode(emp.employeeCode || null);
        setExistingPhotoUrl(emp.photoUrl || null);
        setExistingDocuments(emp.documents || []);
        setSkillRows(
          (emp.skills || []).map((s) => ({
            id: s.id,
            skillId: s.skill.id,
            proficiency: s.proficiency,
            yearsExperience: s.yearsExperience,
          })),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit, id, token]);

  function update<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoSelected(file: File | null) {
    if (!file) {
      setPhotoFile(null);
      setPhotoLowRes(false);
      return;
    }
    const { file: processed, lowResWarning } = await processPhotoFile(file);
    setPhotoFile(processed);
    setPhotoLowRes(lowResWarning);
  }

  function addSkillRow() {
    setSkillRows((rows) => [...rows, { skillId: '', proficiency: '', yearsExperience: '' }]);
  }

  function updateSkillRow(index: number, patch: Partial<EmployeeSkillEntry>) {
    setSkillRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeSkillRow(index: number) {
    setSkillRows((rows) => rows.filter((_, i) => i !== index));
  }

  function queueDocument() {
    if (!newDocFile) return;
    setPendingDocuments((docs) => [...docs, { documentType: newDocType, file: newDocFile, expiryDate: newDocExpiry }]);
    setNewDocFile(null);
    setNewDocExpiry('');
  }

  function removePendingDocument(index: number) {
    setPendingDocuments((docs) => docs.filter((_, i) => i !== index));
  }

  async function handleDeleteExistingDocument(documentId: string) {
    if (!token || !id) return;
    if (!confirm('Remove this document?')) return;
    try {
      const updated = await deleteEmployeeDocument(token, id, documentId);
      setExistingDocuments(updated.documents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to remove document');
    }
  }

  const reportingManagerOptions = useMemo(
    () => allEmployees.filter((e) => e.id !== id),
    [allEmployees, id],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        reportingManagerId: form.reportingManagerId || undefined,
        systemRole: form.systemRole || undefined,
        // Omit entirely (rather than send the unchanged value) when this
        // account can't edit them — the backend only 403s when these keys
        // are actually present, so a Manager/IT Support saving any other
        // field on the form must not trip that check.
        experienceLevel: canEditTalentFields ? form.experienceLevel : undefined,
        deploymentStatus: canEditTalentFields ? form.deploymentStatus : undefined,
      };
      let employeeId = id;
      if (isEdit && id) {
        await updateEmployee(token, id, { ...payload, status: status as EmployeeInput['status'] });
      } else {
        const created = await createEmployee(token, payload);
        employeeId = created.id;
      }
      if (employeeId) {
        if (photoFile) {
          await uploadEmployeePhoto(token, employeeId, photoFile);
        }
        const validSkillRows = skillRows.filter((r) => r.skillId && r.proficiency && r.yearsExperience !== '');
        if (validSkillRows.length > 0 || (isEdit && skillRows.length === 0)) {
          await replaceEmployeeSkills(token, employeeId, validSkillRows);
        }
        for (const doc of pendingDocuments) {
          await uploadEmployeeDocument(token, employeeId, doc.documentType, doc.file, doc.expiryDate || undefined);
        }
      }
      navigate('/employees');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !id) return;
    if (!confirm('Remove this employee? This cannot be undone.')) return;
    await deleteEmployee(token, id);
    navigate('/employees');
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;

  const previewUrl = photoFile
    ? URL.createObjectURL(photoFile)
    : existingPhotoUrl
    ? `${API_BASE}${existingPhotoUrl}`
    : null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{isEdit ? 'Edit Talent Profile' : 'Onboard New Talent'}</h1>
        {employeeCode && (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">
            {employeeCode}
          </span>
        )}
      </div>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 text-xs">
              {previewUrl ? (
                <img src={previewUrl} alt="Employee" className="h-full w-full object-cover" style={{ objectPosition: 'center 20%' }} />
              ) : (
                'No photo'
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoSelected(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {photoLowRes && (
                <p className="text-xs text-amber-600 mt-1">
                  This photo is quite small -- for a crisp avatar, use one at least {AVATAR_MIN_SOURCE_PX}&times;{AVATAR_MIN_SOURCE_PX}px.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Full name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Emergency contact name</label>
              <input
                value={form.emergencyContactName}
                onChange={(e) => update('emergencyContactName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Emergency contact number</label>
              <input
                value={form.emergencyContactPhone}
                onChange={(e) => update('emergencyContactPhone', e.target.value)}
                placeholder="Different from personal phone"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date of joining</label>
              <input
                type="date"
                value={form.dateOfJoining}
                onChange={(e) => update('dateOfJoining', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date of birth</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Placement & Hierarchy */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Organizational Placement &amp; Hierarchy
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => update('departmentId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Team</label>
              <input
                value={form.team}
                onChange={(e) => update('team', e.target.value)}
                placeholder="e.g. IAM Delivery Pod 2"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Designation / Role title</label>
              <select
                value={form.designationId}
                onChange={(e) => update('designationId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Reporting manager</label>
              <select
                value={form.reportingManagerId}
                onChange={(e) => update('reportingManagerId', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {reportingManagerOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                    {e.employeeCode ? ` (${e.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Employee type</label>
              <select
                value={form.employmentType}
                onChange={(e) => update('employmentType', e.target.value as EmployeeInput['employmentType'])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="INTERN">Intern</option>
                <option value="CONTRACTOR">Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Work location</label>
              <input
                value={form.workLocation}
                onChange={(e) => update('workLocation', e.target.value)}
                placeholder="e.g. Pune (Hybrid)"
                list="work-locations-datalist"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {/* Suggestions from Master Data's Locations tab — still a
                  free-text field underneath, so an existing value that
                  isn't (yet) in that managed list keeps working. */}
              <datalist id="work-locations-datalist">
                {workLocations.map((loc) => (
                  <option key={loc.id} value={loc.name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Experience level</label>
              <select
                value={form.experienceLevel}
                onChange={(e) => update('experienceLevel', e.target.value as EmployeeInput['experienceLevel'])}
                disabled={!canEditTalentFields}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {EXPERIENCE_LEVEL_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Deployment status</label>
              <select
                value={form.deploymentStatus}
                onChange={(e) => update('deploymentStatus', e.target.value as EmployeeInput['deploymentStatus'])}
                disabled={!canEditTalentFields}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              >
                {DEPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DEPLOYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!canEditTalentFields && (
            <p className="text-xs text-slate-400">Only Admin or HR can change Experience Level or Deployment Status.</p>
          )}
          <p className="text-xs text-slate-400">
            Don't see the right department or designation? Add it from the Settings page — it'll show up here right
            away.
          </p>
          {isEdit && designationHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Designation history</p>
              <ul className="space-y-1">
                {designationHistory.map((h) => (
                  <li key={h.id} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="text-slate-400">{new Date(h.changedAt).toLocaleDateString()}</span>
                    <span>
                      {h.fromDesignation
                        ? `${h.fromDesignation.name} → ${h.toDesignation?.name ?? '—'}`
                        : `Hired as ${h.toDesignation?.name ?? '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Skills & Security */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Skills &amp; Security</h2>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              System Security Role
            </h3>
            <select
              value={form.systemRole}
              onChange={(e) => update('systemRole', e.target.value as EmployeeInput['systemRole'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-1/2"
            >
              <option value="">— Select —</option>
              <option value="ADMINISTRATOR">Administrator</option>
              <option value="HR">HR</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="IT_SUPPORT">IT Support</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Used for reporting and directory context — doesn't grant or restrict login access on its own.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Initial Baseline Skills Assessment
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Type to search the skill list. Don't see one you need? Add, rename, or remove skills from the
              Settings page — it'll show up here right away.
            </p>
            <div className="space-y-2">
              {skillRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[2fr_1.2fr_0.8fr_auto] gap-2 items-center">
                  <SearchableSelect
                    options={skills}
                    value={row.skillId}
                    onChange={(skillId) => updateSkillRow(index, { skillId })}
                    placeholder="Select skill —"
                    emptyHint="No match — add it from Settings"
                  />
                  <select
                    value={row.proficiency}
                    onChange={(e) =>
                      updateSkillRow(index, { proficiency: e.target.value as EmployeeSkillEntry['proficiency'] })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Proficiency —</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="Yrs exp"
                    value={row.yearsExperience}
                    onChange={(e) =>
                      updateSkillRow(index, {
                        yearsExperience: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSkillRow(index)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSkillRow}
              className="mt-3 text-sm text-mitra-accentFrom hover:underline"
            >
              + Add skill
            </button>
          </div>
        </section>

        {/* Documents */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Documents</h2>

          {existingDocuments && existingDocuments.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {existingDocuments.map((doc) => {
                const status = getExpiryStatus(doc.expiryDate);
                return (
                  <li key={doc.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() => id && token && openAuthedFile(token, `/employees/${id}/documents/${doc.id}/file`)}
                      className="text-slate-700 hover:text-mitra-accentFrom text-left"
                    >
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                        doc.documentType}{' '}
                      — {doc.fileName}
                    </button>
                    <div className="flex items-center gap-3">
                      {status !== 'NONE' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
                          {EXPIRY_STATUS_LABELS[status]}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingDocument(doc.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pendingDocuments.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
              {pendingDocuments.map((doc, index) => (
                <li key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-slate-600">
                    {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                      doc.documentType}{' '}
                    — {doc.file.name}
                    {doc.expiryDate && <> · expires {doc.expiryDate}</>}{' '}
                    <span className="text-xs text-slate-400">(will upload on save)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingDocument(index)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-[1.2fr_1fr_2fr_auto] gap-2 items-center">
            <select
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EMPLOYEE_DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newDocExpiry}
              onChange={(e) => setNewDocExpiry(e.target.value)}
              title="Expiry date (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              type="button"
              onClick={queueDocument}
              disabled={!newDocFile}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:text-red-700">
                Remove employee
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
