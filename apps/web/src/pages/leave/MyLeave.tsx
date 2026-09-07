import { useAuth } from '../../context/AuthContext';
import AttendanceCheckIn from '../../components/AttendanceCheckIn';
import MyLeavePanel from '../../components/MyLeavePanel';

export default function MyLeave() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <AttendanceCheckIn />
      <MyLeavePanel employeeId={user.id} />
    </div>
  );
}
