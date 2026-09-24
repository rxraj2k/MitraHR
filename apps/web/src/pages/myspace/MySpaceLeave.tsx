import { useAuth } from '../../context/AuthContext';
import MyLeavePanel from '../../components/MyLeavePanel';

// My Space's "Leave" sub-view — the full leave management experience
// (balances, request form, comp-off tracking, policy reference, history)
// that already exists as MyLeavePanel, reused directly rather than
// duplicated. My Space's own Summary tab still shows a condensed leave
// snapshot; this is where you come to actually act on it.
export default function MySpaceLeave() {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  if (!myEmployeeId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">Leave</h1>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          Leave shows your own employee record, but your account isn't linked to one yet. Contact HR to get set up.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Leave</h1>
      <MyLeavePanel employeeId={myEmployeeId} title="My Leaves" />
    </div>
  );
}
