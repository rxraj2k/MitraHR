import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  API_BASE,
  getAnnouncements,
  getAttendanceToday,
  getCompanyDocuments,
  getDashboardSummary,
  getLeaveBalances,
  getMyAssets,
  getMyEmployeeDocuments,
  getMyProjects,
  getMyQuizResults,
  getMyTraining,
  getUpcomingBirthdays,
  openAuthedFile,
} from '../lib/api';
import {
  Announcement,
  AssetAssignment,
  AttendanceToday,
  CompanyDocument,
  CompanyDocumentCategory,
  DashboardRange,
  DashboardSummary,
  EmployeeDocument,
  EmployeeTraining,
  LeaveBalance,
  MyProjectAssignment,
  QuizResultRow,
  UpcomingBirthday,
} from '../types';
import AnnouncementFeed from '../components/AnnouncementFeed';
import {
  CATEGORY_LABELS as ASSET_CATEGORY_LABELS,
  CONDITION_LABELS as ASSET_CONDITION_LABELS,
  STATUS_BADGE as ASSET_STATUS_BADGE,
  STATUS_LABELS as ASSET_STATUS_LABELS,
} from '../lib/assetCategories';
import {
  COMPANY_DOCUMENT_CATEGORY_LABELS,
  COMPANY_DOCUMENT_CATEGORY_THEME,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  EXPIRY_STATUS_BADGE,
  EXPIRY_STATUS_LABELS,
  formatFileSize,
  getExpiryStatus,
} from '../lib/documentCategories';
import {
  AwardIcon,
  BriefcaseIcon,
  CakeIcon,
  CalendarCheckIcon,
  GaugeIcon,
  PackageIcon,
  UserPlusIcon,
  UsersIcon,
} from '../components/icons';
import TabBar, { TabBarItem } from '../components/TabBar';
import KpiCard from '../components/dashboard/KpiCard';
import AttendanceTrendChart from '../components/dashboard/AttendanceTrendChart';
import DepartmentDonutChart from '../components/dashboard/DepartmentDonutChart';
import ProjectUtilizationBars from '../components/dashboard/ProjectUtilizationBars';
import UtilizationBarChart from '../components/dashboard/UtilizationBarChart';
import { lightThemeFor } from '../lib/lightPalette';
import {
  AssessmentsFillerCard,
  fillerCountFor,
  LeaveBalanceFillerCard,
  TodayAttendanceFillerCard,
  TrainingProgressFillerCard,
} from '../components/dashboard/SelfServiceFillerCards';
import AssetStatusChart from '../components/dashboard/AssetStatusChart';
import TrainingGaugeChart from '../components/dashboard/TrainingGaugeChart';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

type DashboardTab = 'overview' | 'workforce' | 'leave' | 'projects' | 'recruitment';

const DASHBOARD_TABS: TabBarItem<DashboardTab>[] = [
  { key: 'overview', label: 'Overview', color: 'neutral' },
  { key: 'workforce', label: 'Workforce Analytics', color: 'neutral' },
  { key: 'leave', label: 'Leave & Attendance', color: 'neutral' },
  { key: 'projects', label: 'Project Allocation', color: 'neutral' },
  { key: 'recruitment', label: 'Recruitment', color: 'neutral' },
];

// One card in the widget grid every tab reuses -- same white/bordered
// container as the rest of Home.tsx's sections, just parameterized with a
// title so the four dashboard tabs don't each hand-roll the wrapper.
function ChartCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// A small labeled number used inside the companion stat cards -- not a full
// KpiCard (those are reserved for the always-visible summary bar), just a
// compact way to surface a couple of extra real figures alongside a chart.
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function Home() {
  const { user, token, isStaff } = useAuth();
  const [assignments, setAssignments] = useState<MyProjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [myAssets, setMyAssets] = useState<AssetAssignment[]>([]);
  const [myDocuments, setMyDocuments] = useState<EmployeeDocument[]>([]);
  const [companyDocuments, setCompanyDocuments] = useState<CompanyDocument[]>([]);
  // Grid-filler data -- real self-service info from other modules (My
  // Leave & Attendance, Learning Center), used only to complete a row of
  // project/asset/document cards that doesn't fill out a full line. See
  // components/dashboard/SelfServiceFillerCards.tsx.
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [myTraining, setMyTraining] = useState<EmployeeTraining[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceToday | null>(null);
  const [myQuizResults, setMyQuizResults] = useState<QuizResultRow[]>([]);
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [range, setRange] = useState<DashboardRange>('month');

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
    getDashboardSummary(token, range)
      .then(setDashboard)
      .catch(() => {});
  }, [token, isStaff, range]);

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
    getLeaveBalances(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setLeaveBalances)
      .catch(() => {});
    getMyTraining(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyTraining)
      .catch(() => {});
    getAttendanceToday(token)
      .then(setAttendanceToday)
      .catch(() => {});
    getMyQuizResults(token, user?.kind === 'STAFF' ? employeeId : undefined)
      .then(setMyQuizResults)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, employeeId]);

  const active = assignments.filter((a) => !a.endDate);
  const currentAssets = myAssets.filter((a) => !a.returnedAt);

  const now = new Date();
  const quarterNumber = Math.floor(now.getMonth() / 3) + 1;
  const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: `Quarter ${quarterNumber}` },
    { value: 'year', label: `Year ${now.getFullYear()}` },
  ];

  const assetsTotal = dashboard ? Object.values(dashboard.assetStatusCounts).reduce((a, b) => a + b, 0) : 0;
  const assetsAssigned = dashboard?.assetStatusCounts.ASSIGNED || 0;
  const assetAllocationPercent = assetsTotal ? Math.round((assetsAssigned / assetsTotal) * 100) : 0;
  const benchPercent = dashboard && dashboard.utilizationSummary.total
    ? Math.round((dashboard.utilizationSummary.bench / dashboard.utilizationSummary.total) * 100)
    : 0;
  const onLeaveTrend = dashboard ? dashboard.attendanceTrend.slice(-10).map((p) => p.onLeave) : [];

  // Cycles through the four self-service filler cards in a fixed order,
  // advancing a shared cursor across however many sections need filling on
  // this render -- so if both My Projects and My Assets come up short, they
  // show different filler content instead of both leading with the same
  // one. Purely a rendering-order convenience; nothing here is user state.
  let fillerCursor = 0;
  function renderFillers(count: number) {
    const renderers: ((key: string, theme: ReturnType<typeof lightThemeFor>) => JSX.Element)[] = [
      (key, theme) => <LeaveBalanceFillerCard key={key} balances={leaveBalances} theme={theme} />,
      (key, theme) => <TrainingProgressFillerCard key={key} training={myTraining} theme={theme} />,
      (key, theme) => <TodayAttendanceFillerCard key={key} today={attendanceToday} theme={theme} />,
      (key, theme) => <AssessmentsFillerCard key={key} results={myQuizResults} theme={theme} />,
    ];
    const out: JSX.Element[] = [];
    for (let i = 0; i < count; i++) {
      const renderer = renderers[fillerCursor % renderers.length];
      out.push(renderer(`filler-${fillerCursor}`, lightThemeFor(fillerCursor)));
      fillerCursor += 1;
    }
    return out;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user?.name?.split(' ')[0]}</h1>

      {announcements.length > 0 && token && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Announcements</h2>
          <AnnouncementFeed
            announcements={announcements}
            token={token}
            isStaff={!!isStaff}
            onChanged={loadAnnouncements}
            limit={5}
          />
        </div>
      )}

      {isStaff && dashboard && (
        <div className="bg-[#F8FAFC] dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Company Dashboard</h2>
              <Link to="/reports" className="text-xs font-medium text-mitra-accentFrom hover:underline">
                View detailed reports →
              </Link>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="[&>div]:!mb-0">
                <TabBar tabs={DASHBOARD_TABS} active={dashboardTab} onChange={setDashboardTab} />
              </div>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as DashboardRange)}
                className="text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-7 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compact KPI Summary Bar -- six sleek h-24 cards replacing the old
              oversized gradient tiles, each with a real supporting figure
              rather than an invented trend percentage. */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <KpiCard
              icon={UsersIcon}
              label="Total Headcount"
              value={dashboard.headcount}
              sub={dashboard.newJoinersThisMonth > 0 ? `+${dashboard.newJoinersThisMonth} new` : 'No new joiners'}
              accent="violet"
              to="/employees"
            />
            <KpiCard
              icon={CalendarCheckIcon}
              label="On Leave Today"
              value={dashboard.onLeaveToday}
              sub={`of ${dashboard.headcount} active`}
              accent="amber"
              trend={onLeaveTrend}
              to="/leave"
            />
            <KpiCard
              icon={BriefcaseIcon}
              label="Active Projects"
              value={dashboard.activeProjects}
              sub={`${dashboard.projectUtilization.length} staffed`}
              accent="blue"
              to="/projects"
            />
            <KpiCard
              icon={GaugeIcon}
              label="Bench Resource Ratio"
              value={`${benchPercent}%`}
              sub={`${dashboard.utilizationSummary.bench}/${dashboard.utilizationSummary.total} active`}
              accent="purple"
              to="/utilization"
            />
            <KpiCard
              icon={PackageIcon}
              label="Asset Allocation Rate"
              value={`${assetAllocationPercent}%`}
              sub={`${assetsAssigned}/${assetsTotal} assigned`}
              accent="emerald"
              to="/assets"
            />
            <KpiCard
              icon={AwardIcon}
              label="Training Pass Rate"
              value={`${dashboard.quizPassRatePercent}%`}
              sub={`${dashboard.quizAttemptsTotal} attempt${dashboard.quizAttemptsTotal === 1 ? '' : 's'}`}
              accent="red"
              to="/training"
            />
            <KpiCard
              icon={UserPlusIcon}
              label="Open Positions"
              value={dashboard.openPositions}
              sub={`${dashboard.activeCandidates} active candidate${dashboard.activeCandidates === 1 ? '' : 's'}`}
              accent="cyan"
              to="/recruitment"
            />
          </div>

          {dashboardTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Attendance & Leave Trends">
                  <AttendanceTrendChart data={dashboard.attendanceTrend} height={220} />
                </ChartCard>
                <ChartCard title="Department Allocation">
                  <DepartmentDonutChart data={dashboard.departmentBreakdown} height={220} />
                </ChartCard>
                <ChartCard title="Utilization Breakdown">
                  <UtilizationBarChart summary={dashboard.utilizationSummary} height={220} />
                </ChartCard>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Project Resource Utilization">
                  <ProjectUtilizationBars data={dashboard.projectUtilization} height={220} />
                </ChartCard>
                <ChartCard title="Asset Status">
                  <AssetStatusChart counts={dashboard.assetStatusCounts} height={220} />
                </ChartCard>
                <ChartCard title="Training & Assessments">
                  <TrainingGaugeChart
                    trainingCompletionPercent={dashboard.trainingCompletionPercent}
                    quizPassRatePercent={dashboard.quizPassRatePercent}
                    height={220}
                  />
                </ChartCard>
              </div>
            </div>
          )}

          {dashboardTab === 'workforce' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <ChartCard title="Department Allocation">
                  <DepartmentDonutChart data={dashboard.departmentBreakdown} />
                </ChartCard>
              </div>
              <div className="lg:col-span-2">
                <ChartCard title="Utilization Breakdown">
                  <div className="pt-1">
                    <StatRow label="Bench" value={dashboard.utilizationSummary.bench} />
                    <StatRow label="In Training" value={dashboard.utilizationSummary.inTraining} />
                    <StatRow label="Partially Allocated" value={dashboard.utilizationSummary.partial} />
                    <StatRow label="Fully Allocated" value={dashboard.utilizationSummary.full} />
                    <StatRow label="Over-Allocated" value={dashboard.utilizationSummary.over} />
                    <StatRow label="Training Completion" value={`${dashboard.trainingCompletionPercent}%`} />
                  </div>
                </ChartCard>
              </div>
            </div>
          )}

          {dashboardTab === 'leave' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <ChartCard title="Attendance & Leave Trends">
                  <AttendanceTrendChart data={dashboard.attendanceTrend} />
                </ChartCard>
              </div>
              <div className="lg:col-span-2">
                <ChartCard title="Leave Summary">
                  <div className="pt-1">
                    <StatRow label="On Leave Today" value={dashboard.onLeaveToday} />
                    <StatRow label={`Leave Days (${RANGE_OPTIONS.find((o) => o.value === range)?.label})`} value={dashboard.leaveDaysThisMonth} />
                    <StatRow label="Active Headcount" value={dashboard.headcount} />
                  </div>
                </ChartCard>
              </div>
            </div>
          )}

          {dashboardTab === 'projects' && (
            <ChartCard
              title="Project Resource Utilization"
              action={<span className="text-xs text-slate-400">{dashboard.activeProjects} active projects</span>}
            >
              <ProjectUtilizationBars data={dashboard.projectUtilization} height={340} />
            </ChartCard>
          )}

          {dashboardTab === 'recruitment' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <ChartCard title="Candidate Pipeline by Stage">
                  <DepartmentDonutChart data={dashboard.candidatesByStage} />
                </ChartCard>
              </div>
              <div className="lg:col-span-2">
                <ChartCard
                  title="Recruitment Summary"
                  action={
                    <Link to="/recruitment" className="text-xs text-mitra-accentFrom hover:underline">
                      Open Recruitment &rarr;
                    </Link>
                  }
                >
                  <div className="pt-1">
                    <StatRow label="Open Positions" value={dashboard.openPositions} />
                    <StatRow label="Active Candidates" value={dashboard.activeCandidates} />
                    <StatRow
                      label={`Hires (${RANGE_OPTIONS.find((o) => o.value === range)?.label})`}
                      value={dashboard.hiresThisMonth}
                    />
                  </div>
                </ChartCard>
              </div>
            </div>
          )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.map((a, i) => {
                const theme = lightThemeFor(i);
                const cardClass = `rounded-xl border ${theme.border} ${theme.bg} p-4 flex flex-col${
                  isStaff ? ' hover:shadow-sm transition-shadow' : ''
                }`;
                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.project.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${STATUS_STYLES[a.project.status]}`}>
                        {a.project.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 truncate">{a.project.client.name}</p>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="truncate">{a.roleOnProject || 'Team Member'}</span>
                      <span className="font-medium text-slate-700 flex-shrink-0">{a.allocationPercent}% allocated</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/70 dark:bg-slate-900/40 overflow-hidden mb-3">
                      <div className="h-full rounded-full bg-slate-500/50" style={{ width: `${Math.min(100, a.allocationPercent)}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-2 border-t border-white/70 dark:border-slate-800/40">
                      <span>Since {shortDate(a.startDate)}</span>
                      {a.endDate && <span>Ends {shortDate(a.endDate)}</span>}
                    </div>
                  </>
                );
                return isStaff ? (
                  <Link key={a.id} to={`/projects/${a.project.id}`} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div key={a.id} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
              {renderFillers(fillerCountFor(active.length))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentAssets.map((a, i) => {
                const theme = lightThemeFor(i);
                const cardClass = `rounded-xl border ${theme.border} ${theme.bg} p-4 flex flex-col${
                  isStaff ? ' hover:shadow-sm transition-shadow' : ''
                }`;
                const inner = (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.asset?.name}</p>
                      {a.asset && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${ASSET_STATUS_BADGE[a.asset.status]}`}>
                          {ASSET_STATUS_LABELS[a.asset.status]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1 truncate">
                      {a.asset ? ASSET_CATEGORY_LABELS[a.asset.category] : '—'} · {a.asset?.assetTag}
                    </p>
                    {a.asset?.serialNumber && <p className="text-[11px] text-slate-400 mb-2 truncate">S/N {a.asset.serialNumber}</p>}
                    <p className="text-xs text-slate-500 mb-3">
                      Condition at handoff: <span className="font-medium text-slate-700">{ASSET_CONDITION_LABELS[a.conditionAtAssignment]}</span>
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-2 border-t border-white/70 dark:border-slate-800/40">
                      <span>Since {shortDate(a.assignedAt)}</span>
                      {a.asset?.purchaseDate && <span>Purchased {shortDate(a.asset.purchaseDate)}</span>}
                    </div>
                  </>
                );
                return isStaff ? (
                  <Link key={a.id} to="/assets" className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div key={a.id} className={cardClass}>
                    {inner}
                  </div>
                );
              })}
              {renderFillers(fillerCountFor(currentAssets.length))}
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
            <div className="space-y-5">
              {myDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">On your record</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myDocuments.map((doc, i) => {
                      const status = getExpiryStatus(doc.expiryDate);
                      const theme = lightThemeFor(i);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => token && employeeId && openAuthedFile(token, `/employees/${employeeId}/documents/${doc.id}/file`)}
                          className={`text-left rounded-xl border ${theme.border} ${theme.bg} p-4 hover:shadow-sm transition-shadow flex flex-col`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {EMPLOYEE_DOCUMENT_TYPE_LABELS[doc.documentType as keyof typeof EMPLOYEE_DOCUMENT_TYPE_LABELS] ||
                                doc.documentType}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${EXPIRY_STATUS_BADGE[status]}`}>
                              {EXPIRY_STATUS_LABELS[status]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2 truncate">{doc.fileName}</p>
                          {doc.notes && <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{doc.notes}</p>}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-2 border-t border-white/70 dark:border-slate-800/40">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>Uploaded {shortDate(doc.uploadedAt)}</span>
                          </div>
                          {doc.expiryDate && <p className="text-[11px] text-slate-400 mt-1">Expires {shortDate(doc.expiryDate)}</p>}
                        </button>
                      );
                    })}
                    {renderFillers(fillerCountFor(myDocuments.length))}
                  </div>
                </div>
              )}
              {companyDocuments.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Company documents</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {companyDocuments.map((doc, i) => {
                      const theme = lightThemeFor(i + myDocuments.length);
                      const category = doc.category as CompanyDocumentCategory;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => token && openAuthedFile(token, `/company-documents/${doc.id}/file`)}
                          className={`text-left rounded-xl border ${theme.border} ${theme.bg} p-4 hover:shadow-sm transition-shadow flex flex-col`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                                COMPANY_DOCUMENT_CATEGORY_THEME[category] || COMPANY_DOCUMENT_CATEGORY_THEME.OTHER
                              }`}
                            >
                              {COMPANY_DOCUMENT_CATEGORY_LABELS[category] || doc.category}
                            </span>
                          </div>
                          {doc.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{doc.description}</p>}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-auto pt-2 border-t border-white/70 dark:border-slate-800/40">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>{shortDate(doc.uploadedAt)}</span>
                          </div>
                          {doc.requiresAcknowledgment && (
                            <p className={`text-[11px] font-medium mt-1 ${doc.acknowledgedByMe ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {doc.acknowledgedByMe ? '✓ Acknowledged' : '⚠ Acknowledgment required'}
                            </p>
                          )}
                        </button>
                      );
                    })}
                    {renderFillers(fillerCountFor(companyDocuments.length))}
                  </div>
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
