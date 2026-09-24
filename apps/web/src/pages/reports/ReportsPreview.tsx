import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import TabBar, { TabBarItem } from '../../components/TabBar';
import { getAttendanceSettings, getProjectClosureReports, updateAttendanceSettings } from '../../lib/api';
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  TargetIcon,
  XIcon,
} from '../../components/icons';
import { TILE_THEMES, tileWrapperClass } from '../../lib/tileThemes';
import {
  AttendanceStatus,
  ATTENDANCE_STATUSES,
  FUNNEL_STAGES,
  FunnelStage,
  KpiCardData,
  KpiTone,
} from './previewMockData';
import {
  AttendanceSettings,
  ProjectClosure,
  ReportsPreviewAttendanceLedgerRow,
  ReportsPreviewAttendanceTimeliness,
  ReportsPreviewAttendanceTimelinessRow,
  ReportsPreviewAttritionRisk,
  ReportsPreviewComplianceRadar,
  ReportsPreviewComplianceRow,
  ReportsPreviewFunnelRow,
  ReportsPreviewPerformanceEngagement,
  ReportsPreviewTenureMobilityRow,
  ReportsPreviewTenureSpreadRow,
  ReportsPreviewTrendPoint,
  ReportsPreviewUsClientAlignment,
} from '../../types';
import { useReportsData } from './useReportsData';

// "17:00" -> "5:00 PM" for display; falls back to the raw value if it
// somehow isn't a clean HH:MM (defensive only — the backend validates this
// shape before it's ever stored).
function formatHHMM(hhmm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// ---------------------------------------------------------------------------
// The primary Reports & Analytics page, at /reports. As of Sprint 18, every
// widget, tab, and KPI card here is computed from real records via
// useReportsData.ts, which calls the /reports/preview/* endpoints (named
// for when this was still a design preview; the routes/types keep that
// name, the page itself no longer is one) — each sprint since Sprint 11 has
// been wired in as it landed rather than left as mock: US Client Alignment
// and Pending Policy Signatures (Sprint 16), Last Promotion (Sprint 16's
// DesignationHistory), Turnover Index (Exit & Clearance), Recruitment Speed
// & the ATS/Recruitment Funnel tab (Recruitment/ATS), the Performance &
// Engagement widget (Goals/Reviews/Recognition), and Workforce Sentiment
// (Sprint 15's pulse-survey eNPS). The only "Preview data" tags left mark a
// genuine empty state — no pulse-survey responses yet, or nobody hired
// through the ATS yet — not a fabricated number.
//
// Sprint 18 also added the Attendance Timeliness tab: this company's shift
// is aligned to fixed US client hours (5 PM IST normally, 6 PM IST during
// US Daylight Saving — India itself never observes DST), and this tab is
// the "who's logged in early, late, or on time" view distinct from the raw
// day-by-day Attendance & Punctuality Ledger tab.
//
// The Attendance Policy editor and Project Closures tab were carried over
// from the old, retired ReportsPage.tsx so no functionality was lost when
// this page was promoted to be the default.
// ---------------------------------------------------------------------------

const DATE_RANGES = ['This Month', 'Last Quarter', 'Year-to-Date 2026', 'Trailing 12 Months', 'Custom Range'] as const;
type DeptFilter = 'All Departments' | string;

const KPI_BADGE_CLASSES: Record<KpiTone, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-amber-100 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};
// Small colored dot per tone for the 3D card badge (bg-white/25 chip stays
// the same on every card regardless of hue, so the tone signal — good /
// caution / neutral — now comes from this dot instead of a tinted pill).
const KPI_TONE_DOT: Record<KpiTone, string> = {
  positive: 'bg-emerald-300',
  negative: 'bg-amber-300',
  neutral: 'bg-white/60',
};

function PreviewDataTag() {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200">
      Preview data
    </span>
  );
}

// Every KPI card drills into the deep-dive tab (or, for the two cards with
// no backing feature yet, a short explanation) that backs its number — see
// `handleKpiClick` below for the label -> destination mapping.
function KpiCard({ data, index, onClick }: { data: KpiCardData; index: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${tileWrapperClass(TILE_THEMES[index % TILE_THEMES.length])} focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 group`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/90 flex items-center gap-1">
          {data.label}
          <ChevronRightIcon className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
        </p>
        {data.isMock && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/25 text-white border border-white/30">
            Preview
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mt-3 drop-shadow-sm">{data.value}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {data.badge && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-white/25 text-white">
            <span className={`w-1.5 h-1.5 rounded-full ${KPI_TONE_DOT[data.badge.tone]}`} />
            {data.badge.text}
          </span>
        )}
        {data.subtext && <span className="text-xs text-white/80">{data.subtext}</span>}
      </div>
    </button>
  );
}

function AttendanceTrendChart({ data }: { data: ReportsPreviewTrendPoint[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Workforce Attendance & Absence Trends</h3>
      <p className="text-xs text-slate-400 mb-3">Monthly, trailing 6 months</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(v: number) => `${v}%`}
            width={42}
          />
          <Tooltip
            formatter={(v: number) => [`${v}%`, undefined]}
            contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Line type="monotone" dataKey="present" name="Present %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="paidLeave" name="Paid Leave %" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="unapprovedAbsence"
            name="Unapproved Absence %"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TenureSpreadChart({ data }: { data: ReportsPreviewTenureSpreadRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Departmental Headcount & Tenure Spread</h3>
      <p className="text-xs text-slate-400 mb-3">Active employees by time in company</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar dataKey="lt6mo" name="<6 mos" stackId="a" fill="#c7d2fe" stroke="#fff" strokeWidth={2} />
          <Bar dataKey="m6to12" name="6-12 mos" stackId="a" fill="#818cf8" stroke="#fff" strokeWidth={2} />
          <Bar dataKey="y1to3" name="1-3 yrs" stackId="a" fill="#4f46e5" stroke="#fff" strokeWidth={2} />
          <Bar dataKey="y3plus" name="3+ yrs" stackId="a" fill="#3730a3" stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const RISK_TIER_CLASSES: Record<'High' | 'Medium', string> = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
};

function AttritionRiskWidget({
  risks,
  onViewProfile,
}: {
  risks: ReportsPreviewAttritionRisk[];
  onViewProfile: (row: ReportsPreviewAttritionRisk) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <SparkleIcon className="w-4 h-4 text-fuchsia-500" />
        <h3 className="text-sm font-semibold text-slate-800">AI Attrition Risk Predictor</h3>
      </div>
      {risks.length === 0 ? (
        <p className="text-xs text-slate-400">No employees currently show a real absence or leave-pattern flag.</p>
      ) : (
        <div className="space-y-2.5">
          {risks.map((r) => (
            <div key={r.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-slate-700">{r.name}</span>
                <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RISK_TIER_CLASSES[r.riskTier]}`}>
                  {r.riskTier} risk
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{r.reason}</p>
              <button
                onClick={() => onViewProfile(r)}
                className="text-xs font-medium text-mitra-accentFrom hover:underline"
              >
                View Profile &rarr;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceRadarWidget({
  radar,
  onViewDocuments,
  onViewLaptops,
}: {
  radar: ReportsPreviewComplianceRadar;
  onViewDocuments: () => void;
  onViewLaptops: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldIcon className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">Compliance & IT Asset Radar</h3>
      </div>
      <div className="space-y-1">
        <button
          onClick={onViewDocuments}
          className="w-full flex items-center justify-between text-sm rounded-lg px-1.5 py-1.5 -mx-1.5 hover:bg-slate-50 text-left"
          title="View expiring employee documents in the Compliance & Asset Roster table below"
        >
          <span className="text-slate-600">Documents Expiring Soon</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
            {radar.documentsExpiringSoon}
          </span>
        </button>
        <button
          onClick={onViewLaptops}
          className="w-full flex items-center justify-between text-sm rounded-lg px-1.5 py-1.5 -mx-1.5 hover:bg-slate-50 text-left"
          title="Open Asset Management to see unassigned laptops"
        >
          <span className="text-slate-600">Unassigned Laptops</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {radar.unassignedLaptops}
          </span>
        </button>
        <div className="w-full flex items-center justify-between text-sm rounded-lg px-1.5 py-1.5 -mx-1.5">
          <span className="text-slate-600">Pending Policy Signatures</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              radar.pendingPolicySignatures === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {radar.pendingPolicySignatures}
          </span>
        </div>
      </div>
    </div>
  );
}

function UsClientAlignmentWidget({ summary }: { summary: ReportsPreviewUsClientAlignment }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <GlobeIcon className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-semibold text-slate-800">US Client Alignment</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-slate-800">{summary.timezoneOverlapPercent}%</p>
          <p className="text-xs text-slate-500">Timezone overlap · {summary.timezoneOverlapLabel}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-800">{summary.activeUsProjects}</p>
          <p className="text-xs text-slate-500">Active US project assignments across {summary.activeUsClients} clients</p>
        </div>
      </div>
    </div>
  );
}

// Sprint 18: the one widget covering Performance & Goals and Recognition on
// Reports & Analytics — neither had any representation here before. A
// compact pointer to /performance and /engagement rather than a duplicate
// of either page's own detail.
function PerformanceEngagementWidget({
  data,
  onOpenPerformance,
  onOpenEngagement,
}: {
  data: ReportsPreviewPerformanceEngagement;
  onOpenPerformance: () => void;
  onOpenEngagement: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <TargetIcon className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-800">Performance &amp; Engagement</h3>
      </div>
      {data.activeCycleName ? (
        <div className="space-y-3 mb-3">
          <div>
            <p className="text-2xl font-semibold text-slate-800">
              {data.reviewsFinalizedCount}/{data.reviewsTotalCount}
            </p>
            <p className="text-xs text-slate-500">Reviews finalized · {data.activeCycleName}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-800">
              {data.avgGoalProgressPercent != null ? `${data.avgGoalProgressPercent}%` : '—'}
            </p>
            <p className="text-xs text-slate-500">Avg. goal progress this cycle</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-3">No active review cycle right now.</p>
      )}
      <button
        onClick={onOpenEngagement}
        className="w-full flex items-center justify-between text-sm rounded-lg px-1.5 py-1.5 -mx-1.5 hover:bg-slate-50 text-left border-t border-slate-100 pt-3"
        title="Open Employee Engagement & Feedback"
      >
        <span className="text-slate-600">Kudos Given (30 days)</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          {data.kudosLast30Days}
        </span>
      </button>
      <button onClick={onOpenPerformance} className="text-xs font-medium text-mitra-accentFrom hover:underline mt-2">
        View Performance &amp; Goals &rarr;
      </button>
    </div>
  );
}

function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl border-l border-slate-200 overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm border-b border-slate-50 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (rows.length === 0) return;
  const asRecords = rows as unknown as Record<string, unknown>[];
  const headers = Object.keys(asRecords[0]);
  const lines = [
    headers.join(','),
    ...asRecords.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 10;

function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder,
  searchFn,
  onViewDetails,
  toolbarExtra,
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  searchFn: (row: T, query: string) => boolean;
  onViewDetails: (row: T) => void;
  toolbarExtra?: (resultCount: number) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = query.trim() ? rows.filter((r) => searchFn(r, query.trim().toLowerCase())) : rows;
  const sortCol = columns.find((c) => c.key === sortKey);
  const sorted =
    sortCol && sortCol.sortValue
      ? [...filtered].sort((a, b) => {
          const av = sortCol.sortValue!(a);
          const bv = sortCol.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        })
      : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function toggleSort(col: ColumnDef<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(1);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="relative max-w-xs w-full sm:w-auto flex-shrink-0">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm"
          />
        </div>
        {toolbarExtra?.(filtered.length)}
      </div>
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 font-medium whitespace-nowrap">
                  {col.sortValue ? (
                    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-slate-700">
                      {col.header}
                      <ChevronUpDownIcon className={`w-3.5 h-3.5 ${sortKey === col.key ? 'text-slate-600' : 'text-slate-300'}`} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewDetails(row)}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(row);
                    }}
                    className="text-xs font-medium text-mitra-accentFrom hover:underline whitespace-nowrap"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                  No matching rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>
          Showing {sorted.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1}-
          {Math.min(clampedPage * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={clampedPage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {clampedPage} / {totalPages}
          </span>
          <button
            disabled={clampedPage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Carried over from the old, retired ReportsPage.tsx (the "Late Arrivals &
// Half Days" tab) so the ability to actually edit the lateness/half-day
// policy isn't lost now that this page is the default — the Attendance &
// Punctuality Ledger tab below only ever displayed that data, it never had
// an editor for the policy driving it.
function AttendancePolicyBar({ token }: { token: string }) {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [form, setForm] = useState({
    expectedStartTime: '17:00',
    expectedStartTimeDst: '18:00',
    graceMinutes: 15,
    earlyThresholdMinutes: 10,
    halfDayThresholdHours: 4,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAttendanceSettings(token)
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        setForm({
          expectedStartTime: s.expectedStartTime,
          expectedStartTimeDst: s.expectedStartTimeDst,
          graceMinutes: s.graceMinutes,
          earlyThresholdMinutes: s.earlyThresholdMinutes,
          halfDayThresholdHours: s.halfDayThresholdHours,
        });
      })
      .catch((e: any) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateAttendanceSettings(token, form);
      setSettings(updated);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <p className="text-xs text-slate-400 mb-3">
        This company's shift is aligned to fixed US client hours, so the expected IST start time itself shifts during
        US Daylight Saving (India doesn't observe DST, but the US side does).
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Standard start time (IST)</label>
          <input
            type="time"
            value={form.expectedStartTime}
            onChange={(e) => setForm({ ...form, expectedStartTime: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">During US DST (IST)</label>
          <input
            type="time"
            value={form.expectedStartTimeDst}
            onChange={(e) => setForm({ ...form, expectedStartTimeDst: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Grace period (minutes)</label>
          <input
            type="number"
            min={0}
            max={180}
            value={form.graceMinutes}
            onChange={(e) => setForm({ ...form, graceMinutes: parseInt(e.target.value, 10) || 0 })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Early threshold (minutes)</label>
          <input
            type="number"
            min={0}
            max={180}
            value={form.earlyThresholdMinutes}
            onChange={(e) => setForm({ ...form, earlyThresholdMinutes: parseInt(e.target.value, 10) || 0 })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Half-day threshold (hours)</label>
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={form.halfDayThresholdHours}
            onChange={(e) => setForm({ ...form, halfDayThresholdHours: parseFloat(e.target.value) || 0 })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-28"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
        >
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
        {saved && <span className="text-xs text-emerald-600">Saved.</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// Sprint 18: company-wide punctuality totals for the trailing 30 days,
// shown at the top of the new Attendance Timeliness tab — the per-employee
// breakdown table below it is what answers "who's logged in late, early, or
// on time."
function AttendanceTimelinessSummary({ data }: { data: ReportsPreviewAttendanceTimeliness }) {
  const tiles: { label: string; value: number; className: string }[] = [
    { label: 'Early', value: data.totals.early, className: 'bg-sky-50 text-sky-700 border-sky-200' },
    { label: 'On Time', value: data.totals.onTime, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Late', value: data.totals.late, className: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Absent', value: data.totals.absent, className: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-semibold text-slate-800">Who's Early, Late, or On Time</h3>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs text-slate-500">
          Standard shift start <span className="font-medium text-slate-700">{formatHHMM(data.expectedStartTime)}</span> IST
          {' '}· during US Daylight Saving{' '}
          <span className="font-medium text-slate-700">{formatHHMM(data.expectedStartTimeDst)}</span> IST · trailing{' '}
          {data.windowDays + 1} days
        </p>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {data.totals.onTimeRatePercent}% on time or early
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-lg border px-3 py-2 ${t.className}`}>
            <p className="text-lg font-semibold">{t.value}</p>
            <p className="text-xs">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Also carried over from ReportsPage.tsx — no equivalent tab exists in the
// new layout, so it's added as a 5th tab rather than dropped.
function ProjectClosuresPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<ProjectClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getProjectClosureReports(token)
      .then((r) => !cancelled && setRows(r))
      .catch((e: any) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Every project that's been through the formal "End Project" workflow, with its closing summary and duration.
      </p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No projects have been formally closed out yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.clientName}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {p.startDate && p.endDate && (
                    <p>
                      {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                    </p>
                  )}
                  {p.durationDays != null && <p className="font-medium text-slate-700">{p.durationDays} days</p>}
                </div>
              </div>
              {p.closureSummary && <p className="text-sm text-slate-600 mt-3">{p.closureSummary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type TabKey =
  | 'attendance-ledger'
  | 'attendance-timeliness'
  | 'tenure-mobility'
  | 'recruitment-funnel'
  | 'compliance-roster'
  | 'project-closures';

const TABS: TabBarItem<TabKey>[] = [
  { key: 'attendance-ledger', label: 'Attendance & Punctuality Ledger', color: 'neutral' },
  { key: 'attendance-timeliness', label: 'Attendance Timeliness', color: 'neutral' },
  { key: 'tenure-mobility', label: 'Tenure & Mobility History', color: 'neutral' },
  { key: 'recruitment-funnel', label: 'ATS & Recruitment Funnel', color: 'neutral' },
  { key: 'compliance-roster', label: 'Compliance & Asset Roster', color: 'neutral' },
  { key: 'project-closures', label: 'Project Closures', color: 'neutral' },
];

type SelectedDetail =
  | { kind: 'attendance-ledger'; row: ReportsPreviewAttendanceLedgerRow }
  | { kind: 'attendance-timeliness'; row: ReportsPreviewAttendanceTimelinessRow }
  | { kind: 'tenure-mobility'; row: ReportsPreviewTenureMobilityRow }
  | { kind: 'recruitment-funnel'; row: ReportsPreviewFunnelRow }
  | { kind: 'compliance-roster'; row: ReportsPreviewComplianceRow }
  | { kind: 'attrition-risk'; row: ReportsPreviewAttritionRisk }
  | { kind: 'kpi-info'; card: KpiCardData };

// KPI cards that map straight to one of the deep-dive tabs below — clicking
// jumps there. Turnover Index and Workforce Sentiment are handled as
// special cases in handleKpiClick instead (they link out to /exits and
// /engagement respectively rather than an in-page tab). Any KPI card in
// neither place opens a short explanation — see the 'kpi-info' SlideOver
// body — which today only ever fires for Workforce Sentiment before any
// survey response exists.
const KPI_TAB_LINKS: Partial<Record<string, TabKey>> = {
  'Headcount & Growth': 'tenure-mobility',
  'Workforce Reliability': 'attendance-ledger',
  'Recruitment Speed': 'recruitment-funnel',
};

// Shown in the 'kpi-info' SlideOver for a KPI card that's real but
// genuinely has no data yet (contrast with KPI_TAB_LINKS/the
// Turnover-Index/Workforce-Sentiment special cases, which cover every card
// once it has data).
const KPI_INFO_COPY: Partial<Record<string, string>> = {
  'Workforce Sentiment': 'Will show a real eNPS-style score as soon as employees answer at least one rating question in a Pulse Survey — see the Engagement & Feedback page.',
};

export default function ReportsPreview() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('attendance-ledger');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>('Year-to-Date 2026');
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('All Departments');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'All Statuses'>('All Statuses');
  const [stageFilter, setStageFilter] = useState<FunnelStage | 'All Stages'>('All Stages');
  const [exportOpen, setExportOpen] = useState(false);
  const [detail, setDetail] = useState<SelectedDetail | null>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);

  const { data, loading, error } = useReportsData(token);

  function goToTable(nextTab: TabKey) {
    setTab(nextTab);
    tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleKpiClick(card: KpiCardData) {
    // Turnover Index is always real (Exit & Clearance) — jump straight to
    // its source rather than an in-page tab or an info panel.
    if (card.label === 'Turnover Index') {
      navigate('/exits');
      return;
    }
    // Workforce Sentiment has real data once at least one survey response
    // exists (see formatWorkforceSentimentCard) — jump to the source instead
    // of showing the "not built yet" info panel in that case.
    if (card.label === 'Workforce Sentiment' && !card.isMock) {
      navigate('/engagement');
      return;
    }
    const linkedTab = KPI_TAB_LINKS[card.label];
    if (linkedTab) {
      goToTable(linkedTab);
      return;
    }
    setDetail({ kind: 'kpi-info', card });
  }

  if (!token) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <AlertTriangleIcon className="w-6 h-6 text-rose-400" />
        <p className="text-sm text-slate-600">Couldn't load reports data: {error}</p>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading reports data…</div>;
  }

  const byDept = <T extends { department: string }>(rows: T[]): T[] =>
    deptFilter === 'All Departments' ? rows : rows.filter((r) => r.department === deptFilter);

  const attendanceRows = byDept(data.attendanceLedger).filter(
    (r) => statusFilter === 'All Statuses' || r.status === statusFilter
  );
  const recruitmentRows = data.recruitmentFunnel.filter((r) => stageFilter === 'All Stages' || r.stage === stageFilter);
  const complianceRows = byDept(data.complianceAssetRoster);

  function handleExportCsv() {
    if (tab === 'attendance-ledger') downloadCsv('attendance-ledger.csv', attendanceRows);
    if (tab === 'attendance-timeliness') downloadCsv('attendance-timeliness.csv', data!.attendanceTimeliness.rows);
    if (tab === 'tenure-mobility') downloadCsv('tenure-mobility.csv', byDept(data!.tenureMobility));
    if (tab === 'recruitment-funnel') downloadCsv('recruitment-funnel.csv', recruitmentRows);
    if (tab === 'compliance-roster') downloadCsv('compliance-asset-roster.csv', complianceRows);
    setExportOpen(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Comprehensive workforce health, predictive AI insights, compliance, and recruitment metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as (typeof DATE_RANGES)[number])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            {DATE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option>All Departments</option>
            {data.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <DownloadIcon className="w-4 h-4" /> Export <ChevronUpDownIcon className="w-3.5 h-3.5" />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1"
                onMouseLeave={() => setExportOpen(false)}
              >
                <button onClick={handleExportCsv} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Export as CSV
                </button>
                <button
                  disabled
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                >
                  Export as PDF Report <span className="text-[10px]">Coming soon</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-6 flex items-center gap-1.5 flex-wrap">
        <AlertTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Every widget, tab, and KPI card on this page is computed from real records. A card tagged{' '}
          <PreviewDataTag /> just means that specific feature has no data yet — not that it's placeholder.
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {data.kpiCards.map((k, i) => (
          <KpiCard key={k.label} data={k} index={i} onClick={() => handleKpiClick(k)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AttendanceTrendChart data={data.attendanceTrend} />
        <TenureSpreadChart data={data.tenureSpread} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <AttritionRiskWidget
          risks={data.attritionRisks}
          onViewProfile={(row) => setDetail({ kind: 'attrition-risk', row })}
        />
        <ComplianceRadarWidget
          radar={data.complianceRadar}
          onViewDocuments={() => goToTable('compliance-roster')}
          onViewLaptops={() => navigate('/assets')}
        />
        <UsClientAlignmentWidget summary={data.usClientAlignment} />
        <PerformanceEngagementWidget
          data={data.performanceEngagement}
          onOpenPerformance={() => navigate('/performance')}
          onOpenEngagement={() => navigate('/engagement')}
        />
      </div>

      <div ref={tableSectionRef} className="bg-transparent scroll-mt-4">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'attendance-ledger' && <AttendancePolicyBar token={token} />}

        {tab === 'attendance-timeliness' && <AttendanceTimelinessSummary data={data.attendanceTimeliness} />}

        {tab === 'attendance-ledger' && (
          <DataTable<ReportsPreviewAttendanceLedgerRow>
            rows={attendanceRows}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'attendance-ledger', row })}
            toolbarExtra={(count) => (
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'All Statuses')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option>All Statuses</option>
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Showing {count} record{count === 1 ? '' : 's'}
                </span>
              </>
            )}
            columns={[
              { key: 'name', header: 'Name', sortValue: (r) => r.name },
              { key: 'department', header: 'Department', sortValue: (r) => r.department },
              { key: 'date', header: 'Date', sortValue: (r) => r.date },
              { key: 'checkIn', header: 'Check In' },
              { key: 'checkOut', header: 'Check Out' },
              {
                key: 'status',
                header: 'Status',
                sortValue: (r) => r.status,
                render: (r) => (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'Early'
                        ? 'bg-sky-100 text-sky-700'
                        : r.status === 'On Time'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'Late'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
            ]}
          />
        )}

        {tab === 'attendance-timeliness' && (
          <DataTable<ReportsPreviewAttendanceTimelinessRow>
            rows={byDept(data.attendanceTimeliness.rows)}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'attendance-timeliness', row })}
            toolbarExtra={(count) => (
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Showing {count} employee{count === 1 ? '' : 's'}
              </span>
            )}
            columns={[
              { key: 'name', header: 'Name', sortValue: (r) => r.name },
              { key: 'department', header: 'Department', sortValue: (r) => r.department },
              { key: 'earlyDays', header: 'Early', sortValue: (r) => r.earlyDays },
              { key: 'onTimeDays', header: 'On Time', sortValue: (r) => r.onTimeDays },
              { key: 'lateDays', header: 'Late', sortValue: (r) => r.lateDays },
              { key: 'absentDays', header: 'Absent', sortValue: (r) => r.absentDays },
              {
                key: 'avgLateMinutes',
                header: 'Avg Late By',
                sortValue: (r) => r.avgLateMinutes,
                render: (r) => (r.avgLateMinutes > 0 ? `${r.avgLateMinutes} min` : '—'),
              },
            ]}
          />
        )}

        {tab === 'tenure-mobility' && (
          <DataTable<ReportsPreviewTenureMobilityRow>
            rows={byDept(data.tenureMobility)}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'tenure-mobility', row })}
            columns={[
              { key: 'name', header: 'Name', sortValue: (r) => r.name },
              { key: 'department', header: 'Department', sortValue: (r) => r.department },
              { key: 'designation', header: 'Designation' },
              { key: 'joinDate', header: 'Join Date', sortValue: (r) => r.joinDate },
              { key: 'tenureBucket', header: 'Tenure', sortValue: (r) => r.tenureBucket },
              { key: 'lastPromotion', header: 'Last Promotion' },
            ]}
          />
        )}

        {tab === 'recruitment-funnel' && (
          <DataTable<ReportsPreviewFunnelRow>
            rows={recruitmentRows}
            searchPlaceholder="Search by candidate..."
            searchFn={(r, q) => r.candidate.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'recruitment-funnel', row })}
            toolbarExtra={(count) => (
              <>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as FunnelStage | 'All Stages')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option>All Stages</option>
                  {FUNNEL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Showing {count} candidate{count === 1 ? '' : 's'}
                </span>
              </>
            )}
            columns={[
              { key: 'candidate', header: 'Candidate', sortValue: (r) => r.candidate },
              { key: 'role', header: 'Role' },
              { key: 'source', header: 'Source' },
              { key: 'appliedDate', header: 'Applied', sortValue: (r) => r.appliedDate },
              {
                key: 'stage',
                header: 'Stage',
                sortValue: (r) => r.stage,
                render: (r) => (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.stage === 'Hired'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.stage === 'Rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {r.stage}
                  </span>
                ),
              },
            ]}
          />
        )}

        {tab === 'compliance-roster' && (
          <DataTable<ReportsPreviewComplianceRow>
            rows={complianceRows}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'compliance-roster', row })}
            toolbarExtra={(count) => (
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Showing {count} record{count === 1 ? '' : 's'}
              </span>
            )}
            columns={[
              { key: 'name', header: 'Name', sortValue: (r) => r.name },
              { key: 'department', header: 'Department', sortValue: (r) => r.department },
              { key: 'itemType', header: 'Item' },
              {
                key: 'status',
                header: 'Status',
                sortValue: (r) => r.status,
                render: (r) => (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.status === 'Complete'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'Overdue'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {r.status}
                  </span>
                ),
              },
              { key: 'dueDate', header: 'Due Date', sortValue: (r) => r.dueDate },
            ]}
          />
        )}

        {tab === 'project-closures' && <ProjectClosuresPanel token={token} />}
      </div>

      <SlideOver
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail?.kind === 'kpi-info'
            ? detail.card.label
            : detail?.kind === 'recruitment-funnel'
            ? detail.row.candidate
            : detail
            ? (detail.row as { name: string }).name
            : ''
        }
        subtitle={
          detail?.kind === 'kpi-info'
            ? 'KPI Detail'
            : detail?.kind === 'attrition-risk'
            ? 'AI Attrition Risk Predictor'
            : detail
            ? TABS.find((t) => t.key === detail.kind)?.label
            : undefined
        }
      >
        {detail?.kind === 'attendance-ledger' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Date" value={detail.row.date} />
            <DetailRow label="Check In" value={detail.row.checkIn} />
            <DetailRow label="Check Out" value={detail.row.checkOut} />
            <DetailRow label="Status" value={detail.row.status} />
            {detail.row.lateByMinutes > 0 && <DetailRow label="Late By" value={`${detail.row.lateByMinutes} min`} />}
            {detail.row.earlyByMinutes > 0 && <DetailRow label="Early By" value={`${detail.row.earlyByMinutes} min`} />}
          </>
        )}
        {detail?.kind === 'attendance-timeliness' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Early Days" value={detail.row.earlyDays} />
            <DetailRow label="On Time Days" value={detail.row.onTimeDays} />
            <DetailRow label="Late Days" value={detail.row.lateDays} />
            <DetailRow label="Absent Days" value={detail.row.absentDays} />
            {detail.row.avgLateMinutes > 0 && <DetailRow label="Avg Late By" value={`${detail.row.avgLateMinutes} min`} />}
            {detail.row.avgEarlyMinutes > 0 && <DetailRow label="Avg Early By" value={`${detail.row.avgEarlyMinutes} min`} />}
          </>
        )}
        {detail?.kind === 'tenure-mobility' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Designation" value={detail.row.designation} />
            <DetailRow label="Join Date" value={detail.row.joinDate} />
            <DetailRow label="Tenure Bucket" value={detail.row.tenureBucket} />
            <DetailRow label="Last Promotion" value={detail.row.lastPromotion} />
          </>
        )}
        {detail?.kind === 'recruitment-funnel' && (
          <>
            <DetailRow label="Role" value={detail.row.role} />
            <DetailRow label="Source" value={detail.row.source} />
            <DetailRow label="Applied Date" value={detail.row.appliedDate} />
            <DetailRow label="Current Stage" value={detail.row.stage} />
          </>
        )}
        {detail?.kind === 'compliance-roster' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Item" value={detail.row.itemType} />
            <DetailRow label="Status" value={detail.row.status} />
            <DetailRow label="Due Date" value={detail.row.dueDate} />
          </>
        )}
        {detail?.kind === 'attrition-risk' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Risk Level" value={`${detail.row.riskTier} risk`} />
            <DetailRow label="Signal" value={detail.row.reason} />
            <button
              disabled
              title="Will schedule directly on the calendar once this dashboard connects to live data"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
            >
              Schedule 1:1 &mdash; Coming soon
            </button>
          </>
        )}
        {detail?.kind === 'kpi-info' && (
          <>
            <DetailRow label="Current Value" value={detail.card.value} />
            {detail.card.subtext && <DetailRow label="Detail" value={detail.card.subtext} />}
            <p className="text-sm text-slate-500 mt-4 flex items-start gap-1.5">
              <PreviewDataTag />
            </p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {KPI_INFO_COPY[detail.card.label] ??
                'This is placeholder data — the feature that would make it real has not been built yet.'}
            </p>
          </>
        )}
      </SlideOver>
    </div>
  );
}
