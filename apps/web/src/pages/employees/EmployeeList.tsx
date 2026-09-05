import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, deleteEmployee, getEmployees } from '../../lib/api';
import { Employee } from '../../types';

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  INTERN: 'Intern',
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contractor',
};

type SearchField = 'name' | 'employeeCode' | 'department' | 'email';

const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'employeeCode', label: 'Emp ID' },
  { value: 'department', label: 'Department' },
  { value: 'email', label: 'Email address' },
];

export default function EmployeeList() {
  const { token, isStaff } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SearchField>('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDelete(emp: Employee) {
    if (!token) return;
    if (!confirm(`Remove ${emp.fullName}? This cannot be undone.`)) return;
    setError('');
    setDeletingId(emp.id);
    try {
      await deleteEmployee(token, emp.id);
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((emp) => {
      switch (searchField) {
        case 'name':
          return emp.fullName.toLowerCase().includes(term);
        case 'employeeCode':
          return (emp.employeeCode || '').toLowerCase().includes(term);
        case 'department':
          return (emp.department?.name || '').toLowerCase().includes(term);
        case 'email':
          return emp.email.toLowerCase().includes(term);
        default:
          return true;
      }
    });
  }, [employees, searchField, searchTerm]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Employees</h1>
        {isStaff && (
          <Link
            to="/employees/new"
            className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
          >
            + Onboard Employee
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          {SEARCH_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Search by {opt.label}
            </option>
          ))}
        </select>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search by ${SEARCH_FIELD_OPTIONS.find((o) => o.value === searchField)?.label.toLowerCase()}...`}
          className="flex-1 max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : employees.length === 0 ? (
        <p className="text-slate-500">No employees yet — onboard your first one.</p>
      ) : filteredEmployees.length === 0 ? (
        <p className="text-slate-500">No employees match your search.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Emp ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isStaff && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => emp.photoUrl && setLightboxUrl(`${API_BASE}${emp.photoUrl}`)}
                        className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0"
                        title={emp.photoUrl ? 'Click to enlarge' : undefined}
                      >
                        {emp.photoUrl && (
                          <img
                            src={`${API_BASE}${emp.photoUrl}`}
                            alt={emp.fullName}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                      <Link
                        to={`/employees/${emp.id}`}
                        className="text-slate-800 font-medium hover:text-mitra-accentFrom"
                      >
                        {emp.fullName}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{emp.employeeCode || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.email}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{emp.designation?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {EMPLOYMENT_TYPE_LABELS[emp.employmentType] || emp.employmentType}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {emp.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isStaff && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4 text-xs">
                        <Link to={`/employees/${emp.id}`} className="text-slate-500 hover:text-mitra-accentFrom">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(emp)}
                          disabled={deletingId === emp.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {deletingId === emp.id ? 'Removing...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Employee"
            className="max-h-full max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
