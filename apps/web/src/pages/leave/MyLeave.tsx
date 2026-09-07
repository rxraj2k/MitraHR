import { useAuth } from '../../context/AuthContext';
import MyLeavePanel from '../../components/MyLeavePanel';

export default function MyLeave() {
  const { user } = useAuth();
  if (!user) return null;
  return <MyLeavePanel employeeId={user.id} />;
}
