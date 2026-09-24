import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { decideLeaveRequest, getEmployees, getLeaveRequests } from '../../lib/api';
import { Employee, LeaveRequest } from '../../types';

// My Team's "Team Approvals" sub-view — pending leave requests from direct
// reports, with Approve/Reject.
//
// Both halves of this feature are Staff-only at the backend, not just
// Approve/Reject: PATCH /leave-requests/:id/decide has a StaffOnlyGuard, and
// GET /leave-requests itself ignores the employeeId/status filters entirely
// for an EMPLOYEE-kind session — it always returns only *that session's
// own* requests (see LeaveRequestsController.findAll), so there's no way
// for a non-staff manager to see their reports' pending requests at all
// through this endpoint. Rather than call it anyway and show a misleading
// "nothing pending" (it would always be empty for a manager's own ID),
// this page shows the honest gap directly for a non-staff session.
export default function MyTeamApprovals() {
  const { user, token, isStaff } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pending, setPending] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !isStaff) {
      setLoading(false);
      return;
    }
    getEmployees(token)
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, [token, isStaff]);

  const directReportIds = useMemo(
    () => new Set(employees.filter((e) => e.reportingManagerId === myEmployeeId && e.status === 'ACTIVE').map((e) => e.id)),
    [employees, myEmployeeId],
  );

  useEffect(() => {
    if (!token || !isStaff || directReportIds.size === 0) return;
    getLeaveRequests(token, { status: 'PENDING' })
      .then((all) => setPending(all.filter((r) => directReportIds.has(r.employeeId))))
      .catch((err: Error) => setError(err.message));
  }, [token, isStaff, directReportIds]);

  async function handleDecide(id: string, status: 'APPROVED' | 'REJECTED') {
    if (!token) return;
    setDecidingId(id);
    setError('');
    try {
      await decideLeaveRequest(token, id, status);
      setPending((p) => p.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to update the request');
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Team Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Pending leave requests from your direct reports.</p>
      </div>

      {!isStaff ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          Viewing and deciding your team's pending leave requests requires an Admin/HR account. Ask HR to action any
          pending requests from your reports in the meantime.
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-rose-600 mb-4">{error}</p>}

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : pending.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
              Nothing pending from your team right now.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((lr) => (
                <div
                  key={lr.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{lr.employee?.fullName || 'Employee'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lr.leaveType.name} · {new Date(lr.startDate).toLocaleDateString()} – {new Date(lr.endDate).toLocaleDateString()} ·{' '}
                      {lr.totalDays} day{lr.totalDays === 1 ? '' : 's'}
                    </p>
                    {lr.reason && <p className="text-xs text-slate-400 mt-1">"{lr.reason}"</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDecide(lr.id, 'REJECTED')}
                      disabled={decidingId === lr.id}
                      className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecide(lr.id, 'APPROVED')}
                      disabled={decidingId === lr.id}
                      className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-3 py-1.5 disabled:opacity-50"
                    >
                      {decidingId === lr.id ? 'Saving…' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
