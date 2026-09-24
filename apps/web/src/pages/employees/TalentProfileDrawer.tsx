import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE, getEmployee, getMyAssets, getMyProjects } from '../../lib/api';
import { AssetAssignment, Employee, MyProjectAssignment } from '../../types';
import {
  COMPANY_TIMEZONE_LABEL,
  DEPLOYMENT_STATUS_BADGE,
  DEPLOYMENT_STATUS_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  getClientAllocation,
} from '../../lib/talentDirectory';
import { XIcon } from '../../components/icons';
import Progress3DBar from '../../components/Progress3DBar';

const PROFICIENCY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};
const PROFICIENCY_PERCENT: Record<string, number> = {
  BEGINNER: 25,
  INTERMEDIATE: 50,
  ADVANCED: 75,
  EXPERT: 100,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

function formatDate(d?: string | null) {
  return d ? new Date(d).toLocaleDateString() : null;
}

// Read-only preview — replaces the old behavior of navigating straight into
// EmployeeForm on a row click. Staff who need to actually edit the record
// still can, via the "Edit full profile" link at the bottom.
export default function TalentProfileDrawer({
  employeeId,
  isStaff,
  onClose,
}: {
  employeeId: string;
  isStaff: boolean;
  onClose: () => void;
}) {
  const { token, user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<MyProjectAssignment[]>([]);
  const [assets, setAssets] = useState<AssetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // /projects/my and /assets/my are self-scoped for an OTP employee session
  // (they always resolve to that session's own record, ignoring
  // ?employeeId= — see ProjectsController.myProjects / AssetsController.myAssets)
  // so a colleague's project/asset detail can't be fetched that way. Staff
  // and "viewing my own profile" are the only cases where the data we'd get
  // back is actually about the employee this drawer is open for.
  const isOwnProfile = user?.kind === 'EMPLOYEE' && user.id === employeeId;
  const canSeeProjectsAndAssets = isStaff || isOwnProfile;

  useEffect(() => {
    // Defensive guards: a missing token/employeeId should surface a clear
    // message rather than leaving the drawer stuck on "Loading..." forever
    // or firing a request with a malformed URL.
    if (!employeeId) {
      console.error('[TalentProfileDrawer] opened with no employeeId');
      setError('No employee was selected — please close this and try again.');
      setLoading(false);
      return;
    }
    if (!token) {
      setError('You are not signed in — please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([
      getEmployee(token, employeeId),
      canSeeProjectsAndAssets ? getMyProjects(token, employeeId) : Promise.resolve([]),
      canSeeProjectsAndAssets ? getMyAssets(token, employeeId) : Promise.resolve([]),
    ])
      .then(([emp, proj, ast]) => {
        setEmployee(emp);
        setProjects(proj);
        setAssets(ast);
      })
      .catch((err) => {
        console.error('[TalentProfileDrawer] failed to load profile', employeeId, err);
        setError(err.message || 'Failed to load talent profile');
      })
      .finally(() => setLoading(false));
  }, [token, employeeId, canSeeProjectsAndAssets]);

  const allocation = employee ? getClientAllocation(employee) : null;
  const currentAssets = assets.filter((a) => !a.returnedAt);
  const pastAssets = assets.filter((a) => a.returnedAt);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-slate-800">Talent Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {loading && <p className="p-6 text-slate-500">Loading...</p>}
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}

        {employee && (
          <div className="p-6 space-y-6">
            {/* Overview */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                {employee.photoUrl ? (
                  <img
                    src={`${API_BASE}${employee.photoUrl}`}
                    alt={employee.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  'No photo'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-800">{employee.fullName}</p>
                  {employee.employeeCode && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5">
                      {employee.employeeCode}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{employee.designation?.name || '—'}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                    employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {employee.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <Section title="Talent Overview">
              <div className="grid grid-cols-2 gap-4">
                <OverviewField label="Email" value={employee.email} />
                <OverviewField label="Phone" value={employee.phone || ''} />
                <OverviewField label="Department" value={employee.department?.name || ''} />
                <OverviewField label="Experience tier" value={EXPERIENCE_LEVEL_LABELS[employee.experienceLevel]} />
                <OverviewField label="Work location" value={employee.workLocation || ''} />
                <OverviewField label="Time zone" value={COMPANY_TIMEZONE_LABEL} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${DEPLOYMENT_STATUS_BADGE[employee.deploymentStatus]}`}>
                  {DEPLOYMENT_STATUS_LABELS[employee.deploymentStatus]}
                </span>
                {allocation && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">
                    {allocation.label}
                  </span>
                )}
              </div>
            </Section>

            {/* Technical Skill Matrix */}
            <Section title="Technical Skill Matrix">
              {employee.skills && employee.skills.length > 0 ? (
                <div className="space-y-2">
                  {[...employee.skills]
                    .sort((a, b) => b.yearsExperience - a.yearsExperience)
                    .map((s) => (
                      <div key={s.id}>
                        <div className="flex items-center justify-between text-sm mb-0.5">
                          <span className="text-slate-700">{s.skill.name}</span>
                          <span className="text-xs text-slate-400">
                            {PROFICIENCY_LABELS[s.proficiency] || s.proficiency} · {s.yearsExperience}y
                          </span>
                        </div>
                        <Progress3DBar
                          percent={PROFICIENCY_PERCENT[s.proficiency] || 0}
                          height="h-1.5"
                          fillClassName="bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo"
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No skills logged yet.</p>
              )}
            </Section>

            {/* Current & Past Projects */}
            <Section title="Current &amp; Past Projects">
              {!canSeeProjectsAndAssets ? (
                <p className="text-sm text-slate-400">Only visible to staff or on your own profile.</p>
              ) : projects.length > 0 ? (
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {projects.map((p) => (
                    <li key={p.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{p.project.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            !p.endDate ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {!p.endDate ? 'Current' : 'Past'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.project.client.name}
                        {p.roleOnProject ? ` · ${p.roleOnProject}` : ''} · {p.allocationPercent}% allocation
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(p.startDate)} – {formatDate(p.endDate) || 'present'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No project assignments yet.</p>
              )}
              {canSeeProjectsAndAssets && (
                <p className="text-xs text-slate-400 mt-2">
                  Billing rates aren't tracked in MitraHR yet, so they aren't shown here.
                </p>
              )}
            </Section>

            {/* Equipment & Assets */}
            <Section title="Equipment &amp; Assets">
              {!canSeeProjectsAndAssets ? (
                <p className="text-sm text-slate-400">Only visible to staff or on your own profile.</p>
              ) : currentAssets.length > 0 ? (
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {currentAssets.map((a) => (
                    <li key={a.id} className="px-3 py-2 text-sm flex items-center justify-between">
                      <div>
                        <span className="text-slate-700">{a.asset?.name}</span>
                        <span className="text-xs text-slate-400 ml-1.5">({a.asset?.assetTag})</span>
                      </div>
                      <span className="text-xs text-slate-500">{a.conditionAtAssignment}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No equipment currently issued.</p>
              )}
              {canSeeProjectsAndAssets && pastAssets.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">{pastAssets.length} previously returned item(s) on record.</p>
              )}
              {canSeeProjectsAndAssets && (
                <p className="text-xs text-slate-400 mt-2">
                  Access credentials aren't tracked as data in MitraHR yet — only physical asset hand-outs are shown here.
                </p>
              )}
            </Section>

            {isStaff && (
              <div className="pt-2 border-t border-slate-100">
                <Link to={`/employees/${employee.id}`} className="text-sm text-mitra-accentFrom hover:underline">
                  Edit full profile →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
