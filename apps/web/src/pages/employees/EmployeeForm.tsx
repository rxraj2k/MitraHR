import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createEmployee, deleteEmployee, getEmployee, updateEmployee } from '../../lib/api';
import { EmployeeInput } from '../../types';

const EMPTY: EmployeeInput = {
  fullName: '',
  email: '',
  phone: '',
  employmentType: 'FULL_TIME',
  department: '',
  designation: '',
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
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !token || !id) return;
    getEmployee(token, id)
      .then((emp) => {
        setForm({
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone || '',
          employmentType: emp.employmentType,
          department: emp.department || '',
          designation: emp.designation || '',
          dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : '',
          dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.slice(0, 10) : '',
        });
        setStatus(emp.status);
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
      if (isEdit && id) {
        await updateEmployee(token, id, { ...form, status: status as EmployeeInput['status'] });
      } else {
        await createEmployee(token, form);
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

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
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
            <input
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Designation</label>
            <input
              value={form.designation}
              onChange={(e) => update('designation', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
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
