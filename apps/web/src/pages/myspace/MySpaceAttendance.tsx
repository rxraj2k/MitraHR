import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import PersonalMonthCalendar from '../../components/PersonalMonthCalendar';

// My Space's "Attendance" sub-view — today's check-in plus the full
// month calendar, both already-existing components (previously only shown
// together on the EMPLOYEE-only /my-leave page).
export default function MySpaceAttendance() {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  if (!myEmployeeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">Attendance</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          Attendance shows your own employee record, but your account isn't linked to one yet. Contact HR to get set
          up.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Attendance</h1>
      <AttendanceCheckIn />
      <PersonalMonthCalendar employeeId={myEmployeeId} />
    </div>
  );
}
