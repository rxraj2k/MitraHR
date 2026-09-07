import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import PersonalMonthCalendar from '../../components/PersonalMonthCalendar';
import MyLeavePanel from '../../components/MyLeavePanel';

export default function MyLeave() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <AttendanceCheckIn />
      <PersonalMonthCalendar employeeId={user.id} />
      <MyLeavePanel employeeId={user.id} />
    </div>
  );
}
