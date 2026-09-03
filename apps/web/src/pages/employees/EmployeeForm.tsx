import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  API_BASE,
  createEmployee,
  deleteEmployee,
  getDepartments,
  getDesignations,
  getEmployee,
  updateEmployee,
  uploadEmployeePhoto,
} from '../../lib/api';
import { EmployeeInput, LookupItem } from '../../types';

const EMPTY: EmployeeInput = {
  fullName: '',
  email: '',
  phone: '',
  employmentType: 'FULL_TIME',
  departmentId: '',
  designationId: '',
  dateOfJoining: '',
  dateOfBirth: '',
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<EmployeeInput>(EMPTY);
  const [status, setStatus] = useState('ACTIVE');
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([getDepartments(token), getDesignations(token)])
      .then(([depts, desigs]) => {
        setDepartments(depts);
        setDesignations(desigs);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    getEmployee(token, id)
      .then((emp) => {
        setForm({
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone || '',
          employmentType: emp.employmentType,
          departmentId: emp.departmentId || '',
          designationId: emp.designationId || '',
          dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : '',
          dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
        });
        setStatus(emp.status);
        setExistingPhotoUrl(emp.photoUrl || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit, id, token]);

  function update<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
      };
      let employeeId = id;
      if (isEdit && id) {
        await updateEmployee(token, id, { ...payload, status: status as EmployeeInput['status'] });
      } else {
        const created = await createEmployee(token, payload);
        employeeId = created.id;
      }
      if (photoFile && employeeId) {
        await uploadEmployeePhoto(token, employeeId, photoFile);
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
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 text-xs">
            {previewUrl ? (
              <img src={previewUrl} alt="Employee" className="h-full w-full object-cover" />
            ) : (
              'No photo'
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
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
        </div>
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
            <label className="block text-sm text-slate-600 mb-1">Designation</label>
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
        </div>
        <p className="text-xs text-slate-400 -mt-2">
          Don't see the right option? Add it from the Settings page — it'll show up here right away.
        </p>
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
              className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
