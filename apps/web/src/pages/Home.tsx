import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  API_BASE,
  getAnnouncements,
  getCompanyDocuments,
  getDashboardSummary,
  getMyAssets,
  getMyEmployeeDocuments,
  getMyProjects,
  getUpcomingBirthdays,
  openAuthedFile,
} from '../lib/api';
import {
  Announcement,
  AssetAssignment,
  CompanyDocument,
  DashboardSummary,
  EmployeeDocument,
  MyProjectAssignment,
  UpcomingBirthday,
} from '../types';
import AnnouncementBoard from '../components/AnnouncementBoard';
import { CATEGORY_LABELS as ASSET_CATEGORY_LABELS, STATUS_BADGE as ASSET_STATUS_BADGE, STATUS_LABELS as ASSET_STATUS_LABELS } from '../lib/assetCategories';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  getExpiryStatus,
} from '../lib/documentCategories';
import {
  AlertTriangleIcon,
  AwardIcon,
  BriefcaseIcon,
  CakeIcon,
  CalendarCheckIcon,
  CheckCircleIcon,
  GaugeIcon,
  GraduationCapIcon,
  PackageIcon,
  UsersIcon,
} from '../components/icons';
import MetricTile from '../components/MetricTile';
import { TILE_THEMES, tileWrapperClass } from '../lib/tileThemes';

function birthdayWhen(daysUntil: number) {
  if (daysUntil === 0) return 'Today!';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Home() {
  const { user, token, isStaff } = useAuth();
  const [assignments, setAssignments] = useState<MyProjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [myAssets, setMyAssets] = useState<AssetAssignment[]>([]);
  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const employeeId = user?.kind === 'EMPLOYEE' ? user.id : user?.employeeId;

  useEffect(() => {
    if (!token) return;
    getUpcomingBirthdays(token, 7)
      .then(setBirthdays)
      .catch(() => {});
  }, [token]);

  const loadAnnouncements = () => {
    if (!token) return;
    getAnnouncements(token)
      .then(setAnnouncements)
      .catch(() => {});
  };

  useEffect(loadAnnouncements, [token]);

  useEffect(() => {
    if (!token || !isStaff) return;
    getDashboardSummary(token)
      .then(setDashboard)
      .catch(() => {});
  }, [token, isStaff]);

  useEffect(() => {
    if (!token || !employeeId) return;
    setLoading(true);
    getMyProjects(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
    getMyAssets(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyAssets)
      .catch(() => {});
    getMyEmployeeDocuments(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyDocuments)
      .catch(() => {});
    getCompanyDocuments(token)
      .then(setCompanyDocuments)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, employeeId]);

  const active = assignments.filter((a) => !a.endDate);
  const currentAssets = myAssets.filter((a) => !a.returnedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name?.split(' ')[0]}</h1>

      {announcements.length > 0 && token && (
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-3">Announcements</h2>
          <AnnouncementBoard
            announcements={announcements}
            token={token}
            isStaff={!!isStaff}
            onChanged={loadAnnouncements}
            limit={6}
          />
        </div>
      )}

      {isStaff && dashboard && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Company Dashboard</h2>
            <Link to="/reports" className="text-xs font-medium text-mitra-accentFrom hover:underline">
              View detailed reports →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/employees" className={tileWrapperClass(TILE_THEMES[0])}>
              <MetricTile
                icon={UsersIcon}
                label="Headcount"
                value={dashboard.headcount}
                sub={dashboard.newJoinersThisMonth > 0 ? `+${dashboard.newJoinersThisMonth} this month` : undefined}
              />
            </Link>
            <Link to="/leave" className={tileWrapperClass(TILE_THEMES[1])}>
              <MetricTile icon={CalendarCheckIcon} label="Leave Days This Month" value={dashboard.leaveDaysThisMonth} />
            </Link>
            <Link to="/projects" className={tileWrapperClass(TILE_THEMES[2])}>
              <MetricTile icon={BriefcaseIcon} label="Active Projects" value={dashboard.activeProjects} />
            </Link>
            <Link to="/utilization" className={tileWrapperClass(TILE_THEMES[5])}>
              <MetricTile
                icon={GaugeIcon}
                label="On Bench"
                value={dashboard.utilizationSummary.bench}
                sub={`of ${dashboard.utilizationSummary.total} active`}
              />
            </Link>
            <Link to="/assets" className={tileWrapperClass(TILE_THEMES[6])}>
              <MetricTile
                icon={PackageIcon}
                label="Assets Assigned"
                value={dashboard.assetStatusCounts.ASSIGNED || 0}
                sub={`of ${Object.values(dashboard.assetStatusCounts).reduce((a, b) => a + b, 0)} total`}
              />
            </Link>
            <Link to="/training" className={tileWrapperClass(TILE_THEMES[3])}>
              <MetricTile icon={GraduationCapIcon} label="Training Completion" value={`${dashboard.trainingCompletionPercent}%`} />
            </Link>
            <Link to="/reports" className={tileWrapperClass(TILE_THEMES[4])}>
              <MetricTile icon={AlertTriangleIcon} label="Over-Allocated" value={dashboard.utilizationSummary.over} />
            </Link>
            <Link to="/reports" className={tileWrapperClass(TILE_THEMES[7])}>
              <MetricTile icon={CheckCircleIcon} label="Fully Allocated" value={dashboard.utilizationSummary.full} />
            </Link>
            <Link to="/training" className={tileWrapperClass(TILE_THEMES[5])}>
              <MetricTile
                icon={AwardIcon}
                label="Assessment Pass Rate"
                value={`${dashboard.quizPassRatePercent}%`}
                sub={`${dashboard.quizAttemptsTotal} assessment${dashboard.quizAttemptsTotal === 1 ? '' : 's'} taken`}
              />
            </Link>
          </div>
        </div>
      )}

      {birthdays.length > 0 && (
        <div className="bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CakeIcon className="w-5 h-5 text-fuchsia-500" />
            <h2 className="text-sm font-semibold text-slate-700">Birthdays</h2>
          </div>
          <ul className="flex flex-wrap gap-3">
            {birthdays.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-2 bg-white border border-fuchsia-100 rounded-full pl-1.5 pr-3 py-1.5"
              >
                {b.photoUrl ? (
                  <img src={`${API_BASE}${b.photoUrl}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 text-xs font-semibold flex items-center justify-center">
                    {b.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-slate-700">{b.fullName}</span>
                <span className="text-xs text-fuchsia-500 font-medium">{birthdayWhen(b.daysUntil)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Projects</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : active.length === 0 ? (
            <p className="text-slate-500 text-sm">Not currently staffed on a project.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Allocation</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {active.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 font-medium text-slate-700">{a.project.name}</td>
                      <td className="py-2 text-slate-500">{a.project.client.name}</td>
                      <td className="py-2 text-slate-500">{a.roleOnProject || '—'}</td>
                      <td className="py-2 text-slate-500">{a.allocationPercent}%</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[a.project.status]}`}>
                          {a.project.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Assets</h2>
          {currentAssets.length === 0 ? (
            <p className="text-slate-500 text-sm">Nothing currently checked out to you.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Asset</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Tag</th>
                    <th className="pb-2 font-medium">Since</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAssets.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2 font-medium text-slate-700">{a.asset?.name}</td>
                      <td className="py-2 text-slate-500">{a.asset ? ASSET_CATEGORY_LABELS[a.asset.category] : '—'}</td>
                      <td className="py-2 text-slate-500">{a.asset?.assetTag}</td>
                      <td className="py-2 text-slate-500">{new Date(a.assignedAt).toLocaleDateString()}</td>
                      <td className="py-2">
                        {a.asset && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ASSET_STATUS_BADGE[a.asset.status]}`}>
                            {ASSET_STATUS_LABELS[a.asset.status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {employeeId && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">My Documents</h2>
          {myDocuments.length === 0 && companyDocuments.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents on file yet.</p>
          ) : (
            <div className="space-y-4">
              {myDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">On your record</p>
                  <ul className="space-y-1.5">
                    {myDocuments.map((doc) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      return (
                        <li key={doc.id} className="flex items-center justify-between text-sm">
                          <button
                            onClick={() => token && employeeId && openAuthedFile(token, `/employees/${employeeId}/documents/${doc.id}/file`)}
                            className="text-slate-700 hover:text-mitra-accentFrom text-left"
                          >
                            {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                              doc.documentType}{' '}
                            — {doc.fileName}
                          </button>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${EXPIRY_STATUS_BADGE[status]}`}>
                            {EXPIRY_STATUS_LABELS[status]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {companyDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Company documents</p>
                  <ul className="space-y-1.5">
                    {companyDocuments.map((doc) => (
                      <li key={doc.id}>
                        <button
                          onClick={() => token && openAuthedFile(token, `/company-documents/${doc.id}/file`)}
                          className="text-sm text-slate-700 hover:text-mitra-accentFrom text-left"
                        >
                          {doc.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-slate-500">
        This is your MitraHR home. Use the tabs on the left to manage your team, leaves, projects, and more.
      </p>
    </div>
  );
}
