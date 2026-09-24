import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, getEmployee, openAuthedFile, updateMyProfile } from '../../lib/api';
import { Employee } from '../../types';
import { EMPLOYEE_DOCUMENT_TYPE_LABELS, EXPIRY_STATUS_BADGE, EXPIRY_STATUS_LABELS, getExpiryStatus } from '../../lib/documentCategories';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contractor',
};

const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

// Read-only profile shown to OTP-logged-in employees — viewing a colleague
// shows everything except editing controls; viewing your own record adds a
// small self-service field (just phone, for now).
export default function EmployeeProfileView() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const isOwnProfile = user?.kind === 'EMPLOYEE' && user.id === id;

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    getEmployee(token, id)
      .then((emp) => {
        setEmployee(emp);
        setPhone(emp.phone || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingPhone(true);
    setPhoneSaved(false);
    setError('');
    try {
      const updated = await updateMyProfile(token, { phone });
      setEmployee(updated);
      setPhoneSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSavingPhone(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (error && !employee) return <div className="text-sm text-red-600">{error}</div>;
  if (!employee) return null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {isOwnProfile ? 'My Profile' : employee.fullName}
        </h1>
        {employee.employeeCode && (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">
            {employee.employeeCode}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {employee.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </span>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
            {employee.photoUrl ? (
              <img
                src={`${API_BASE}${employee.photoUrl}`}
                alt={employee.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              'No photo'
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">{employee.fullName}</p>
            <p className="text-sm text-slate-500">{employee.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" value={employee.department?.name || ''} />
          <Field label="Designation" value={employee.designation?.name || ''} />
          <Field label="Team" value={employee.team || ''} />
          <Field label="Work location" value={employee.workLocation || ''} />
          <Field
            label="Employee type"
            value={EMPLOYMENT_TYPE_LABELS[employee.employmentType] || employee.employmentType}
          />
          <Field
            label="Reporting manager"
            value={employee.reportingManager ? employee.reportingManager.fullName : ''}
          />
          <Field label="Date of joining" value={employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : ''} />
        </div>

        {isOwnProfile && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency contact name" value={employee.emergencyContactName || ''} />
            <Field label="Emergency contact number" value={employee.emergencyContactPhone || ''} />
          </div>
        )}
        {isOwnProfile && employee.address && <Field label="Address" value={employee.address} />}

        <div>
          <p className="text-xs text-slate-400 mb-1">Phone</p>
          {isOwnProfile ? (
            <form onSubmit={handleSavePhone} className="flex items-center gap-2 max-w-xs">
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneSaved(false);
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Add a phone number"
              />
              <button
                type="submit"
                disabled={savingPhone}
                className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-3 py-2 disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {savingPhone ? 'Saving...' : 'Save'}
              </button>
              {phoneSaved && <span className="text-xs text-emerald-600">Saved</span>}
            </form>
          ) : (
            <p className="text-sm text-slate-700">{employee.phone || '—'}</p>
          )}
        </div>

        {employee.skills && employee.skills.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {employee.skills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {s.skill.name} · {PROFICIENCY_LABELS[s.proficiency] || s.proficiency} · {s.yearsExperience}y
                </span>
              ))}
            </div>
          </div>
        )}

        {employee.documents && employee.documents.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Documents</p>
            <ul className="space-y-1.5">
              {employee.documents.map((doc) => {
                const status = getExpiryStatus(doc.expiryDate);
                return (
                  <li key={doc.id} className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => id && token && openAuthedFile(token, `/employees/${id}/documents/${doc.id}/file`)}
                      className="text-slate-700 hover:text-mitra-accentFrom text-left"
                    >
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                        doc.documentType}{' '}
                      — {doc.fileName}
                    </button>
                    {status !== 'NONE' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
                        {EXPIRY_STATUS_LABELS[status]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <Link to="/employees" className="mt-4 inline-block text-sm text-slate-500 hover:text-mitra-accentFrom">
        ← Back to Talent Directory
      </Link>
    </div>
  );
}
