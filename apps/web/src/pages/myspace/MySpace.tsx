import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import { Avatar } from '../../components/Avatar';
import {
  acknowledgeCompanyDocument,
  getAnnouncements,
  getCompanyDocuments,
  getEmployee,
  getLeaveBalances,
  getLeaveCalendar,
  getLeaveRequests,
  getUpcomingBirthdays,
} from '../../lib/api';
import { Announcement, CompanyDocument, Employee, Holiday, LeaveBalance, LeaveRequest, UpcomingBirthday } from '../../types';
import { CakeIcon, ClipboardListIcon, FileTextIcon } from '../../components/icons';

// Strips the rich-text HTML announcements store down to plain text for this
// compact preview — same helper as Organization's Overview tab uses.
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function birthdayWhen(daysUntil: number) {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

// "My Space" — the personal self-service hub half of the Zoho-People-style
// nav reorg (the other half is My Team). Every widget here reads data that
// already exists elsewhere in MitraHR (leave balances, holidays, pending
// leave requests, policy acknowledgments, birthdays, announcements) — this
// page is a new, compact *view* over it, not new backend surface.
//
// Two spec items don't have a real backing model in this schema and are
// honestly substituted rather than faked: "expense approvals" (no Expense
// entity exists anywhere) and "document signatures" (no e-signature flow
// exists) — both become "pending policy acknowledgments" below, which is
// the closest real equivalent already in the product (see PoliciesTab in
// Organization.tsx).
export default function MySpace() {
  const { user, token } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [pendingLeave, setPendingLeave] = useState<LeaveRequest[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<CompanyDocument[]>([]);
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ackingId, setAckingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !myEmployeeId) {
      setNotLinked(!myEmployeeId);
      setLoading(false);
      return;
    }
    getEmployee(token, myEmployeeId)
      .then(setEmployee)
      .catch(() => setNotLinked(true))
      .finally(() => setLoading(false));
  }, [token, myEmployeeId]);

  useEffect(() => {
    if (!token || !myEmployeeId || notLinked) return;
    const now = new Date();
    Promise.all([
      getLeaveBalances(token, myEmployeeId),
      getLeaveCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1),
      getLeaveRequests(token, { employeeId: myEmployeeId, status: 'PENDING' }),
      getCompanyDocuments(token),
      getUpcomingBirthdays(token, 30),
      getAnnouncements(token),
    ])
      .then(([b, cal, pending, docs, bdays, ann]) => {
        setBalances(b);
        // Only this month's remaining holidays — a lightweight "snapshot",
        // not the full year-round calendar (that lives at My Leave).
        const todayStr = now.toISOString().slice(0, 10);
        setHolidays(cal.holidays.filter((h) => h.date >= todayStr).slice(0, 4));
        setPendingLeave(pending);
        setPendingPolicies(docs.filter((d) => d.category === 'POLICY' && d.acknowledgedByMe === false));
        setBirthdays(bdays.filter((b2) => b2.id !== myEmployeeId));
        setAnnouncements(ann.slice(0, 3));
      })
      .catch(() => {});
  }, [token, myEmployeeId, notLinked]);

  async function handleAcknowledge(id: string) {
    if (!token) return;
    setAckingId(id);
    try {
      await acknowledgeCompanyDocument(token, id);
      setPendingPolicies((docs) => docs.filter((d) => d.id !== id));
    } finally {
      setAckingId(null);
    }
  }

  if (!user || !token) return null;

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  if (notLinked || !employee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">My Space</h1>
        <p className="text-sm text-slate-500 mb-6">Your personal self-service hub.</p>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          My Space shows your own employee record, but your account isn't linked to one yet. Contact HR to get set
          up, or use the Talent Directory to browse the team in the meantime.
        </div>
      </div>
    );
  }

  const totalPendingApprovals = pendingLeave.length + pendingPolicies.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">My Space</h1>
        <p className="text-sm text-slate-500 mt-1">Your personal self-service hub.</p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center gap-5">
        <Avatar name={employee.fullName} photoUrl={employee.photoUrl} size="lg" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-lg font-semibold text-slate-800">{employee.fullName}</p>
          <p className="text-sm text-slate-500">{employee.designation?.name || '—'}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-slate-400">
            <span>ID: {employee.employeeCode || '—'}</span>
            <span>{employee.email}</span>
            <span>{employee.department?.name || 'Unassigned'}</span>
            <span>Reports to: {employee.reportingManager?.fullName || '—'}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Link to={`/employees/${employee.id}`} className="text-xs font-medium text-mitra-accentFrom hover:underline">
            Full Profile →
          </Link>
          <Link to="/my-space/performance" className="text-xs font-medium text-mitra-accentFrom hover:underline">
            My Performance →
          </Link>
        </div>
      </div>

      {/* Quick Attendance & Leave Snapshot */}
      <AttendanceCheckIn />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Leave Balances</h3>
            <Link to="/my-leave" className="text-xs font-medium text-mitra-accentFrom hover:underline">
              Manage leave →
            </Link>
          </div>
          {balances.length === 0 ? (
            <p className="text-sm text-slate-400">No leave balances on file yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {balances.map((b) => (
                <div key={b.leaveTypeId} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500 truncate">{b.leaveTypeName}</p>
                  <p className="text-lg font-semibold text-slate-800 mt-0.5">{b.remaining ?? '—'}</p>
                  <p className="text-[11px] text-slate-400">{b.remaining != null ? 'days left' : 'unlimited'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Upcoming Holidays</h3>
          {holidays.length === 0 ? (
            <p className="text-sm text-slate-400">No holidays coming up this month.</p>
          ) : (
            <ul className="space-y-2">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{h.name}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* My Approvals & Tasks */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">My Approvals & Tasks</h3>
            {totalPendingApprovals > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                {totalPendingApprovals}
              </span>
            )}
          </div>
          <Link to="/my-space/approvals-documents" className="text-xs font-medium text-mitra-accentFrom hover:underline">
            View all →
          </Link>
        </div>
        {totalPendingApprovals === 0 ? (
          <p className="text-sm text-slate-400">Nothing pending — you're all caught up.</p>
        ) : (
          <div className="space-y-2">
            {pendingLeave.map((lr) => (
              <div
                key={lr.id}
                className="flex items-center justify-between text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
              >
                <span className="text-slate-700">
                  Leave request · {lr.leaveType.name} · {new Date(lr.startDate).toLocaleDateString()} –{' '}
                  {new Date(lr.endDate).toLocaleDateString()}
                </span>
                <span className="text-xs font-medium text-amber-700">Pending approval</span>
              </div>
            ))}
            {pendingPolicies.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <FileTextIcon className="w-3.5 h-3.5 text-slate-400" /> Acknowledge policy: {doc.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleAcknowledge(doc.id)}
                  disabled={ackingId === doc.id}
                  className="text-xs font-medium text-white bg-mitra-accentFrom rounded-lg px-2.5 py-1 disabled:opacity-50"
                >
                  {ackingId === doc.id ? 'Saving…' : 'Acknowledge'}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3">
          Expense approvals and e-signatures aren't part of MitraHR yet — this shows your pending leave requests and
          policy acknowledgments instead.
        </p>
      </div>

      {/* Personal Announcements & Birthday Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CakeIcon className="w-4 h-4 text-fuchsia-400" />
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Birthdays</h3>
          </div>
          {birthdays.length === 0 ? (
            <p className="text-sm text-slate-400">No peer birthdays in the next 30 days.</p>
          ) : (
            <ul className="space-y-2.5">
              {birthdays.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center gap-2.5">
                  <Avatar name={b.fullName} photoUrl={b.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.fullName}</span>
                  <span className="text-xs text-fuchsia-500 font-medium flex-shrink-0">{birthdayWhen(b.daysUntil)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Company News</h3>
            <Link to="/organization" className="text-xs font-medium text-mitra-accentFrom hover:underline">
              View all →
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-400">No announcements posted yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {announcements.map((a) => {
                const preview = stripHtml(a.body);
                return (
                  <li key={a.id} className="text-sm">
                    <p className="text-slate-700 font-medium truncate">{a.title}</p>
                    {preview && (
                      <p className="text-xs text-slate-400 truncate">
                        {preview.length > 90 ? `${preview.slice(0, 90)}…` : preview}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
