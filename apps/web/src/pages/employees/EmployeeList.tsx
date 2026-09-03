import { useEffect, useState } from 'react';
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

export default function EmployeeList() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Employees</h1>
        <Link
          to="/employees/new"
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2"
        >
          + Add Employee
        </Link>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : employees.length === 0 ? (
        <p className="text-slate-500">No employees yet — add your first one.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                      <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                        {emp.photoUrl && (
                          <img
                            src={`${API_BASE}${emp.photoUrl}`}
                            alt={emp.fullName}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="text-slate-800 font-medium group-hover:text-mitra-accentFrom">
                        {emp.fullName}
                      </span>
                    </Link>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
