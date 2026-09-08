import { useAuth } from '../../context/AuthContext';
import MyLearningPanel from '../../components/MyLearningPanel';

export default function MyLearning() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">My Learning</h1>
      <MyLearningPanel employeeId={user.id} title="Your Onboarding Journey" />
    </div>
  );
}
