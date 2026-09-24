import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import PersonalMonthCalendar from '../../components/PersonalMonthCalendar';
import MyLeavePanel from '../../components/MyLeavePanel';

// My Space's "Attendance & Leaves" sub-view — merges what were briefly two
// separate sub-views (Attendance, Leave) into one per the latest nav spec,
// stacking today's check-in + the month calendar above the full leave
// panel (balances, request form, comp-off, history) rather than adding
// another in-page tab bar — the whole point of this nav round was moving
// sub-view switching into the sidebar, not reintroducing pill tabs here.
export default function MySpaceAttendanceLeave() {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  if (!myEmployeeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">Attendance & Leaves</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          This shows your own employee record, but your account isn't linked to one yet. Contact HR to get set up.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Attendance & Leaves</h1>
      <AttendanceCheckIn />
      <PersonalMonthCalendar employeeId={myEmployeeId} />
      <MyLeavePanel employeeId={myEmployeeId} title="My Leaves" />
    </div>
  );
}
