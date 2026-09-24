// Onboard New Talent — a guided 4-step wizard, replacing the old flat
// "Onboard Employee" form for the CREATE flow only. Editing an existing
// employee still uses EmployeeForm.tsx (the read-only TalentProfileDrawer's
// "Edit full profile" link, and the Update Skills quick action, both point
// there) — this component is reached only from "+ Onboard Talent" on the
// Talent Directory (App.tsx: employees/new).
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createEmployee,
  getDepartments,
  getDesignations,
  getEmployees,
  getSkills,
  replaceEmployeeSkills,
  uploadEmployeeDocument,
  uploadEmployeePhoto,
} from '../../lib/api';
import { Employee, EmployeeInput, LookupItem, Proficiency } from '../../types';
import SearchableSelect from '../../components/SearchableSelect';
import { EMPLOYEE_DOCUMENT_TYPES, EMPLOYEE_DOCUMENT_TYPE_LABELS } from '../../lib/documentCategories';
import { DEPLOYMENT_STATUSES, DEPLOYMENT_STATUS_LABELS, EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS } from '../../lib/talentDirectory';
import { CameraIcon, CheckCircleIcon, ChevronLeftIcon, UploadCloudIcon, XIcon } from '../../components/icons';

const DRAFT_KEY = 'mitrahr:onboardTalentDraft';

const STEPS = [
  { n: 1, label: 'Personal Details' },
  { n: 2, label: 'Role & Placement' },
  { n: 3, label: 'Skills & Access' },
  { n: 4, label: 'Onboarding Documents' },
] as const;

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

// Same 4 real levels used everywhere else in the app (EmployeeSkill.proficiency) —
// shown as quick badges here rather than a bare dropdown, not as a second
// competing vocabulary.
const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

// Relabeled display only — same underlying SYSTEM_ROLES values this app has
// always used (employees/dto/create-employee.dto.ts), so an existing
// account's role keeps meaning the same thing everywhere else in the app.
const SYSTEM_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ADMINISTRATOR', label: 'Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'MANAGER', label: 'Engineering Manager' },
  { value: 'IT_SUPPORT', label: 'IT Support' },
  { value: 'EMPLOYEE', label: 'Talent / Employee' },
];

const DOC_SLOTS: { type: string; label: string }[] = [
  { type: 'OFFER_LETTER', label: 'Offer Letter' },
  { type: 'ID_PROOF', label: 'Gov ID / Passport' },
  { type: 'CONTRACT', label: 'NDA / Contracts' },
  { type: 'CERTIFICATION', label: 'Certifications' },
];

interface SelectedSkill {
  skillId: string;
  name: string;
  proficiency: Proficiency;
}

interface ExtraDocument {
  documentType: string;
  file: File;
  expiryDate: string;
}

interface DraftShape {
  form: EmployeeInput;
  selectedSkills: SelectedSkill[];
  step: number;
  savedAt: string;
}

function loadDraft(): DraftShape | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftShape) : null;
  } catch {
    return null;
  }
}

export default function OnboardTalentWizard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const canEditTalentFields = user?.role === 'ADMIN' || user?.role === 'HR';

  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [form, setForm] = useState<EmployeeInput>(EMPTY);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [skills, setSkills] = useState<LookupItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDragOver, setPhotoDragOver] = useState(false);

  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [skillToAdd, setSkillToAdd] = useState('');

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docDragOver, setDocDragOver] = useState<string | null>(null);
  const [extraDocuments, setExtraDocuments] = useState<ExtraDocument[]>([]);
  const [showMoreDocs, setShowMoreDocs] = useState(false);
  const [extraDocType, setExtraDocType] = useState<string>('PAN_CARD');
  const [extraDocFile, setExtraDocFile] = useState<File | null>(null);
  const [extraDocExpiry, setExtraDocExpiry] = useState('');

  const [draftBanner, setDraftBanner] = useState<DraftShape | null>(null);
  const [draftSavedNote, setDraftSavedNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([getDepartments(token), getDesignations(token), getSkills(token), getEmployees(token)])
      .then(([depts, desigs, sk, emps]) => {
        setDepartments(depts);
        setDesignations(desigs);
        setSkills(sk);
        setAllEmployees(emps);
      })
      .catch((err) => setError(err.message));
    const d = loadDraft();
    if (d) setDraftBanner(d);
  }, [token]);

  function update<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resumeDraft() {
    if (!draftBanner) return;
    setForm(draftBanner.form);
    setSelectedSkills(draftBanner.selectedSkills);
    setStep(draftBanner.step);
    setFurthestStep(draftBanner.step);
    setDraftBanner(null);
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setDraftBanner(null);
  }

  function saveAsDraft() {
    // Only the plain form fields + chosen skills survive — File objects
    // (photo, documents) aren't serializable, so they're intentionally not
    // part of the saved draft; re-attach those after resuming.
    const draft: DraftShape = { form, selectedSkills, step, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSavedNote('Draft saved on this device (photo/documents are not saved — re-attach after resuming).');
    } catch {
      setDraftSavedNote('Could not save draft in this browser.');
    }
  }

  function stepError(n: number): string | null {
    if (n === 1) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.email.trim() || !form.email.includes('@')) return 'A valid work email is required.';
    }
    return null;
  }

  function goNext() {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    const next = Math.min(step + 1, STEPS.length);
    setStep(next);
    setFurthestStep((f) => Math.max(f, next));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  function goToStep(n: number) {
    if (n > furthestStep) return;
    setError('');
    setStep(n);
  }

  function handlePhotoDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setPhotoDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setPhotoFile(file);
  }

  function addSkill(skillId: string) {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill || selectedSkills.some((s) => s.skillId === skillId)) return;
    setSelectedSkills((rows) => [...rows, { skillId, name: skill.name, proficiency: 'INTERMEDIATE' }]);
    setSkillToAdd('');
  }

  function setSkillProficiency(skillId: string, proficiency: Proficiency) {
    setSelectedSkills((rows) => rows.map((r) => (r.skillId === skillId ? { ...r, proficiency } : r)));
  }

  function removeSkill(skillId: string) {
    setSelectedSkills((rows) => rows.filter((r) => r.skillId !== skillId));
  }

  function handleDocDrop(type: string, e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDocDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) setDocFiles((d) => ({ ...d, [type]: file }));
  }

  function queueExtraDocument() {
    if (!extraDocFile) return;
    setExtraDocuments((docs) => [...docs, { documentType: extraDocType, file: extraDocFile, expiryDate: extraDocExpiry }]);
    setExtraDocFile(null);
    setExtraDocExpiry('');
  }

  const skillOptionsRemaining = useMemo(
    () => skills.filter((s) => !selectedSkills.some((sel) => sel.skillId === s.id)),
    [skills, selectedSkills],
  );

  const remainingDocTypes = useMemo(
    () => EMPLOYEE_DOCUMENT_TYPES.filter((t) => !DOC_SLOTS.some((slot) => slot.type === t)),
    [],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const err = stepError(1);
    if (err) {
      setStep(1);
      setError(err);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        reportingManagerId: form.reportingManagerId || undefined,
        systemRole: form.systemRole || undefined,
        experienceLevel: canEditTalentFields ? form.experienceLevel : undefined,
        deploymentStatus: canEditTalentFields ? form.deploymentStatus : undefined,
      };
      const created = await createEmployee(token, payload);
      if (photoFile) await uploadEmployeePhoto(token, created.id, photoFile);
      if (selectedSkills.length > 0) {
        await replaceEmployeeSkills(
          token,
          created.id,
          selectedSkills.map((s) => ({ skillId: s.skillId, proficiency: s.proficiency, yearsExperience: 0 })),
        );
      }
      for (const slot of DOC_SLOTS) {
        const file = docFiles[slot.type];
        if (file) await uploadEmployeeDocument(token, created.id, slot.type, file);
      }
      for (const doc of extraDocuments) {
        await uploadEmployeeDocument(token, created.id, doc.documentType, doc.file, doc.expiryDate || undefined);
      }
      localStorage.removeItem(DRAFT_KEY);
      navigate('/employees');
    } catch (err: any) {
      setError(err.message || 'Failed to onboard talent');
    } finally {
      setSaving(false);
    }
  }

  const reportingManagerOptions = allEmployees;
  const previewUrl = photoFile ? URL.createObjectURL(photoFile) : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Onboard New Talent</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Complete profile setup, organizational alignment, and technical skill mapping.
        </p>
      </div>

      {draftBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="text-amber-700">
            You have an unfinished draft saved {new Date(draftBanner.savedAt).toLocaleString()}.
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={resumeDraft} className="text-amber-800 font-medium hover:underline">
              Resume
            </button>
            <button onClick={discardDraft} className="text-slate-500 hover:underline">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => goToStep(s.n)}
              disabled={s.n > furthestStep}
              className="flex items-center gap-2 group"
            >
              <span
                className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium flex-shrink-0 ${
                  step === s.n
                    ? 'bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white'
                    : s.n < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {s.n < step ? <CheckCircleIcon className="w-4 h-4" /> : s.n}
              </span>
              <span className={`text-sm hidden sm:inline ${step === s.n ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${s.n < step ? 'bg-emerald-200' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {draftSavedNote && <div className="text-xs text-emerald-600 mb-4">{draftSavedNote}</div>}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Details */}
        {step === 1 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setPhotoDragOver(true);
                }}
                onDragLeave={() => setPhotoDragOver(false)}
                onDrop={handlePhotoDrop}
                className={`relative h-24 w-24 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-dashed ${
                  photoDragOver ? 'border-mitra-accentFrom bg-indigo-50' : 'border-slate-300 bg-slate-50'
                }`}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400 text-center px-2">Drag &amp; drop or upload</span>
                )}
                <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-mitra-accentFrom text-white flex items-center justify-center cursor-pointer shadow">
                  <CameraIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Profile photo</p>
                <p className="text-xs text-slate-400">Optional — drag an image onto the circle or use the camera button.</p>
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
              <label className="block text-sm text-slate-600 mb-1">Work email</label>
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
              <div>
                <label className="block text-sm text-slate-600 mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
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
                <label className="block text-sm text-slate-600 mb-1">Emergency contact phone</label>
                <input
                  value={form.emergencyContactPhone}
                  onChange={(e) => update('emergencyContactPhone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date of birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update('dateOfBirth', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date of joining</label>
                <input
                  type="date"
                  value={form.dateOfJoining}
                  onChange={(e) => update('dateOfJoining', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Role & Placement */}
        {step === 2 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6">
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
                <label className="block text-sm text-slate-600 mb-1">Designation / Role</label>
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
                <label className="block text-sm text-slate-600 mb-1">Team / Pod</label>
                <input
                  value={form.team}
                  onChange={(e) => update('team', e.target.value)}
                  placeholder="e.g. IAM Delivery Pod 2"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
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
              <div>
                <label className="block text-sm text-slate-600 mb-1">Employment type</label>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
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
                <label className="block text-sm text-slate-600 mb-1">Initial deployment status</label>
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
              <p className="text-xs text-slate-400 mt-3">Only Admin or HR can set Experience Level or Deployment Status.</p>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Don't see the right department or designation? Add it from the Settings page — it'll show up here right
              away.
            </p>
          </section>
        )}

        {/* Step 3: Skills & Access */}
        {step === 3 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">System role</h3>
              <select
                value={form.systemRole}
                onChange={(e) => update('systemRole', e.target.value as EmployeeInput['systemRole'])}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-1/2"
              >
                <option value="">— Select —</option>
                {SYSTEM_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Skill assessment</h3>
              <p className="text-xs text-slate-400 mb-2">
                Search and add primary skills, then set a proficiency badge for each.
              </p>
              <SearchableSelect
                options={skillOptionsRemaining}
                value={skillToAdd}
                onChange={(id) => addSkill(id)}
                placeholder="Search skills (e.g. IAM, React, AWS, PyTorch)..."
                emptyHint="No match — add it from Settings"
              />
              {selectedSkills.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedSkills.map((s) => (
                    <div key={s.skillId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-700">{s.name}</span>
                      <div className="flex items-center gap-1">
                        {PROFICIENCY_LEVELS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSkillProficiency(s.skillId, p)}
                            className={`text-xs px-2 py-1 rounded-full ${
                              s.proficiency === p ? 'bg-mitra-accentFrom text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {PROFICIENCY_LABELS[p]}
                          </button>
                        ))}
                        <button type="button" onClick={() => removeSkill(s.skillId)} className="ml-1 text-slate-400 hover:text-red-500">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 4: Onboarding Documents */}
        {step === 4 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {DOC_SLOTS.map((slot) => (
                <div
                  key={slot.type}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDocDragOver(slot.type);
                  }}
                  onDragLeave={() => setDocDragOver(null)}
                  onDrop={(e) => handleDocDrop(slot.type, e)}
                  className={`rounded-xl border-2 border-dashed p-4 text-center ${
                    docDragOver === slot.type ? 'border-mitra-accentFrom bg-indigo-50' : 'border-slate-200'
                  }`}
                >
                  <UploadCloudIcon className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 mt-1">{slot.label}</p>
                  {docFiles[slot.type] ? (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-600">
                      <span className="truncate max-w-[140px]">{docFiles[slot.type]?.name}</span>
                      <button type="button" onClick={() => setDocFiles((d) => ({ ...d, [slot.type]: null }))}>
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 inline-block text-xs text-mitra-accentFrom hover:underline cursor-pointer">
                      Drag &amp; drop or browse
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setDocFiles((d) => ({ ...d, [slot.type]: e.target.files?.[0] || null }))}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            {extraDocuments.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {extraDocuments.map((doc, index) => (
                  <li key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-600">
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                        doc.documentType}{' '}
                      — {doc.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraDocuments((docs) => docs.filter((_, i) => i !== index))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showMoreDocs ? (
              <div className="grid grid-cols-[1.2fr_1fr_2fr_auto] gap-2 items-center pt-2 border-t border-slate-100">
                <select
                  value={extraDocType}
                  onChange={(e) => setExtraDocType(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {remainingDocTypes.map((t) => (
                    <option key={t} value={t}>
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={extraDocExpiry}
                  onChange={(e) => setExtraDocExpiry(e.target.value)}
                  title="Expiry date (optional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setExtraDocFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <button
                  type="button"
                  onClick={queueExtraDocument}
                  disabled={!extraDocFile}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowMoreDocs(true)} className="text-sm text-mitra-accentFrom hover:underline">
                + Add another document type
              </button>
            )}
          </section>
        )}

        {/* Sticky bottom actions */}
        <div className="sticky bottom-0 mt-6 -mx-6 sm:mx-0 bg-white border-t border-slate-200 sm:border sm:rounded-xl px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/employees')} className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveAsDraft} className="text-sm text-slate-500 hover:text-slate-700">
              Save as Draft
            </button>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-5 py-2 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-5 py-2 disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {saving ? 'Onboarding...' : 'Submit & Onboard'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
