import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
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
import TabBar, { TabBarItem } from '../../components/TabBar';
import {
  AlertTriangleIcon,
  ChevronUpDownIcon,
  DownloadIcon,
  GlobeIcon,
  SearchIcon,
  ShieldIcon,
  SparkleIcon,
  XIcon,
} from '../../components/icons';
import {
  ATTENDANCE_LEDGER,
  ATTENDANCE_TREND,
  ATTRITION_RISKS,
  AttendanceLedgerRow,
  COMPLIANCE_ASSET_ROSTER,
  COMPLIANCE_RADAR,
  ComplianceAssetRow,
  Department,
  DEPARTMENTS,
  KPI_CARDS,
  KpiCardData,
  KpiTone,
  RECRUITMENT_FUNNEL,
  RecruitmentFunnelRow,
  RiskTier,
  TENURE_MOBILITY,
  TENURE_SPREAD,
  TenureMobilityRow,
  US_CLIENT_ALIGNMENT,
} from './previewMockData';

// ---------------------------------------------------------------------------
// DESIGN PREVIEW — mock data only, nothing on this page talks to the real
// API yet. Built to judge the new layout/blueprint before any backend work
// starts; see ReportsPage.tsx for the real, currently-live Reports page.
// ---------------------------------------------------------------------------

const DATE_RANGES = ['This Month', 'Last Quarter', 'Year-to-Date 2026', 'Trailing 12 Months', 'Custom Range'] as const;
type DeptFilter = 'All Departments' | Department;

const KPI_BADGE_CLASSES: Record<KpiTone, string> = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-amber-100 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};

function KpiCard({ data }: { data: KpiCardData }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-medium text-slate-500">{data.label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{data.value}</p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {data.badge && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KPI_BADGE_CLASSES[data.badge.tone]}`}>
            {data.badge.text}
          </span>
        )}
        {data.subtext && <span className="text-xs text-slate-400">{data.subtext}</span>}
      </div>
    </div>
  );
}

function AttendanceTrendChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Workforce Attendance & Absence Trends</h3>
      <p className="text-xs text-slate-400 mb-3">Monthly, trailing 6 months</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={ATTENDANCE_TREND} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" width={40} />
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

function TenureSpreadChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Departmental Headcount & Tenure Spread</h3>
      <p className="text-xs text-slate-400 mb-3">Active employees by time in company</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={TENURE_SPREAD} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
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

const RISK_TIER_CLASSES: Record<RiskTier, string> = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
};

function AttritionRiskWidget() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <SparkleIcon className="w-4 h-4 text-fuchsia-500" />
        <h3 className="text-sm font-semibold text-slate-800">AI Attrition Risk Predictor</h3>
      </div>
      <div className="space-y-2.5">
        {ATTRITION_RISKS.map((r) => (
          <div key={r.id} className="border border-slate-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-slate-700">{r.name}</span>
              <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RISK_TIER_CLASSES[r.riskTier]}`}>
                {r.riskTier} risk
              </span>
            </div>
            <p className="text-xs text-slate-500">{r.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceRadarWidget() {
  const items: { label: string; count: number; tone: 'rose' | 'amber' | 'slate' }[] = [
    { label: 'Upcoming Visa Expirations', count: COMPLIANCE_RADAR.visaExpirations, tone: 'rose' },
    { label: 'Pending Policy Signatures', count: COMPLIANCE_RADAR.pendingPolicySignatures, tone: 'amber' },
    { label: 'Unassigned Laptops', count: COMPLIANCE_RADAR.unassignedLaptops, tone: 'slate' },
  ];
  const toneClasses = { rose: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700', slate: 'bg-slate-100 text-slate-600' };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldIcon className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">Compliance & IT Asset Radar</h3>
      </div>
      <div className="space-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{it.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${toneClasses[it.tone]}`}>{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsClientAlignmentWidget() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <GlobeIcon className="w-4 h-4 text-sky-500" />
        <h3 className="text-sm font-semibold text-slate-800">US Client Alignment</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-slate-800">{US_CLIENT_ALIGNMENT.timezoneOverlapPercent}%</p>
          <p className="text-xs text-slate-500">Timezone overlap · {US_CLIENT_ALIGNMENT.timezoneOverlapLabel}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-800">{US_CLIENT_ALIGNMENT.activeUsProjects}</p>
          <p className="text-xs text-slate-500">Active US project assignments across {US_CLIENT_ALIGNMENT.activeUsClients} clients</p>
        </div>
      </div>
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
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  searchFn: (row: T, query: string) => boolean;
  onViewDetails: (row: T) => void;
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
      <div className="relative max-w-xs mb-3">
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

type TabKey = 'attendance-ledger' | 'tenure-mobility' | 'recruitment-funnel' | 'compliance-roster';

const TABS: TabBarItem<TabKey>[] = [
  { key: 'attendance-ledger', label: 'Attendance & Punctuality Ledger', color: 'rose' },
  { key: 'tenure-mobility', label: 'Tenure & Mobility History', color: 'indigo' },
  { key: 'recruitment-funnel', label: 'ATS & Recruitment Funnel', color: 'fuchsia' },
  { key: 'compliance-roster', label: 'Compliance & Asset Roster', color: 'amber' },
];

type SelectedDetail =
  | { kind: 'attendance-ledger'; row: AttendanceLedgerRow }
  | { kind: 'tenure-mobility'; row: TenureMobilityRow }
  | { kind: 'recruitment-funnel'; row: RecruitmentFunnelRow }
  | { kind: 'compliance-roster'; row: ComplianceAssetRow };

export default function ReportsPreview() {
  const [tab, setTab] = useState<TabKey>('attendance-ledger');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]>('Year-to-Date 2026');
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('All Departments');
  const [exportOpen, setExportOpen] = useState(false);
  const [detail, setDetail] = useState<SelectedDetail | null>(null);

  const byDept = <T extends { department: Department }>(rows: T[]): T[] =>
    deptFilter === 'All Departments' ? rows : rows.filter((r) => r.department === deptFilter);

  function handleExportCsv() {
    if (tab === 'attendance-ledger') downloadCsv('attendance-ledger.csv', byDept(ATTENDANCE_LEDGER));
    if (tab === 'tenure-mobility') downloadCsv('tenure-mobility.csv', byDept(TENURE_MOBILITY));
    if (tab === 'recruitment-funnel') downloadCsv('recruitment-funnel.csv', RECRUITMENT_FUNNEL);
    if (tab === 'compliance-roster') downloadCsv('compliance-asset-roster.csv', byDept(COMPLIANCE_ASSET_ROSTER));
    setExportOpen(false);
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">Reports & Analytics</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700">
              Design Preview
            </span>
          </div>
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
            onChange={(e) => setDeptFilter(e.target.value as DeptFilter)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option>All Departments</option>
            {DEPARTMENTS.map((d) => (
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

      <p className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
        <AlertTriangleIcon className="w-3.5 h-3.5" />
        Every number on this page is hardcoded mock data for layout review — nothing here is connected to the real
        API yet. The live Reports page is still at{' '}
        <Link to="/reports" className="underline hover:text-slate-600">
          Reports & Analytics
        </Link>
        .
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {KPI_CARDS.map((k) => (
          <KpiCard key={k.label} data={k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AttendanceTrendChart />
        <TenureSpreadChart />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <AttritionRiskWidget />
        <ComplianceRadarWidget />
        <UsClientAlignmentWidget />
      </div>

      <div className="bg-transparent">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'attendance-ledger' && (
          <DataTable<AttendanceLedgerRow>
            rows={byDept(ATTENDANCE_LEDGER)}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'attendance-ledger', row })}
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
                      r.status === 'On Time'
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

        {tab === 'tenure-mobility' && (
          <DataTable<TenureMobilityRow>
            rows={byDept(TENURE_MOBILITY)}
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
          <DataTable<RecruitmentFunnelRow>
            rows={RECRUITMENT_FUNNEL}
            searchPlaceholder="Search by candidate..."
            searchFn={(r, q) => r.candidate.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'recruitment-funnel', row })}
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
          <DataTable<ComplianceAssetRow>
            rows={byDept(COMPLIANCE_ASSET_ROSTER)}
            searchPlaceholder="Search by name..."
            searchFn={(r, q) => r.name.toLowerCase().includes(q)}
            onViewDetails={(row) => setDetail({ kind: 'compliance-roster', row })}
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
                        : r.status === 'Due Soon'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
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
      </div>

      <SlideOver
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail?.kind === 'recruitment-funnel'
            ? detail.row.candidate
            : detail
            ? (detail.row as { name: string }).name
            : ''
        }
        subtitle={detail ? TABS.find((t) => t.key === detail.kind)?.label : undefined}
      >
        {detail?.kind === 'attendance-ledger' && (
          <>
            <DetailRow label="Department" value={detail.row.department} />
            <DetailRow label="Date" value={detail.row.date} />
            <DetailRow label="Check In" value={detail.row.checkIn} />
            <DetailRow label="Check Out" value={detail.row.checkOut} />
            <DetailRow label="Status" value={detail.row.status} />
            {detail.row.lateByMinutes > 0 && <DetailRow label="Late By" value={`${detail.row.lateByMinutes} min`} />}
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
      </SlideOver>
    </div>
  );
}
