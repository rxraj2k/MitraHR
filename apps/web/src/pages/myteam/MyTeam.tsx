import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TalentProfileDrawer from '../employees/TalentProfileDrawer';
import { Avatar } from '../../components/Avatar';
import { getAttendanceCalendar, getEmployees, getLeaveCalendar } from '../../lib/api';
import { Employee } from '../../types';
import { DEPLOYMENT_STATUS_BADGE, DEPLOYMENT_STATUS_LABELS } from '../../lib/talentDirectory';
import { MailIcon } from '../../components/icons';

// My Team's "Direct Reports" sub-view — the team overview bar + roster.
// Team Attendance, Team Approvals, and Team Tree are their own sub-views
// now (MyTeamAttendance.tsx / MyTeamApprovals.tsx / MyTeamTree.tsx),
// reachable from the sidebar's My Team sub-nav rather than being sections
// on this one page.
export default function MyTeam() {
  const { user, token, isStaff } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [onLeaveTodayIds, setOnLeaveTodayIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getEmployees(token)
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    getAttendanceCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1)
      .then(({ days }) => {
        const today = days.find((d) => d.date.slice(0, 10) === todayStr);
        setOnlineIds(new Set((today?.present || []).map((e) => e.id)));
      })
      .catch(() => {});
    getLeaveCalendar(token, now.getUTCFullYear(), now.getUTCMonth() + 1)
      .then(({ requests }) =>
        setOnLeaveTodayIds(
          new Set(
            requests
              .filter((r) => r.status === 'APPROVED' && r.startDate.slice(0, 10) <= todayStr && r.endDate.slice(0, 10) >= todayStr)
              .map((r) => r.employeeId),
          ),
        ),
      )
      .catch(() => {});
  }, [token]);

  const directReports = useMemo(
    () => employees.filter((e) => e.reportingManagerId === myEmployeeId && e.status === 'ACTIVE'),
    [employees, myEmployeeId],
  );
  const activeToday = directReports.filter((e) => onlineIds.has(e.id)).length;
  const onLeaveToday = directReports.filter((e) => onLeaveTodayIds.has(e.id)).length;

  if (!user || !token) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Direct Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Your team, and who's active today.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : directReports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          You don't currently have any direct reports in MitraHR. Once employees are assigned to report to you (in
          Placement &amp; Hierarchy), they'll show up here.
        </div>
      ) : (
        <>
          {/* Team Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400">Direct Reports</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{directReports.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400">Active Today</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{activeToday}</p>
              <p className="text-xs text-slate-400 mt-1">checked in</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-400">On Leave Today</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{onLeaveToday}</p>
            </div>
          </div>

          {/* Direct Reports Roster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {directReports.map((e) => (
              <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="relative">
                    <Avatar name={e.fullName} photoUrl={e.photoUrl} size="lg" shape="square" />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        onlineIds.has(e.id) ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={onlineIds.has(e.id) ? 'Checked in today' : 'Not checked in yet'}
                    />
                  </div>
                  <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${DEPLOYMENT_STATUS_BADGE[e.deploymentStatus]}`}>
                    {DEPLOYMENT_STATUS_LABELS[e.deploymentStatus]}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{e.fullName}</p>
                <p className="text-xs text-slate-400">{e.designation?.name || '—'}</p>
                <p className="text-xs text-slate-500 truncate mt-1 flex items-center gap-1">
                  <MailIcon className="w-3 h-3 flex-shrink-0" /> {e.email}
                </p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDrawerEmployeeId(e.id)}
                    className="text-xs font-medium text-mitra-accentFrom hover:underline"
                  >
                    View Profile
                  </button>
                  <Link to="/engagement" className="text-xs font-medium text-slate-500 hover:text-mitra-accentFrom hover:underline">
                    Give Kudos
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {drawerEmployeeId && (
        <TalentProfileDrawer employeeId={drawerEmployeeId} isStaff={isStaff} onClose={() => setDrawerEmployeeId(null)} />
      )}
    </div>
  );
}
