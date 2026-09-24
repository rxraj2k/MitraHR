import { useAuth } from '../../context/AuthContext';
import OrgChart from '../OrgChart';

// My Team's "Team Tree" sub-view — reuses the entire Team Topology
// component (toolbar, zoom, search, export, drawer) re-rooted at the
// current manager, instead of duplicating tree-rendering logic.
export default function MyTeamTree() {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId || user?.id;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Team Tree</h1>
        <p className="text-sm text-slate-500 mt-1">Your team's reporting line.</p>
      </div>
      <OrgChart hideHeader rootEmployeeId={myEmployeeId} />
    </div>
  );
}
