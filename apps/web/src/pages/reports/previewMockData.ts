// Hardcoded, realistic-looking mock data for the Reports & Analytics design
// preview (see ReportsPreview.tsx). Nothing here is wired to the real API —
// this file exists purely so the new layout can be judged on its own before
// any backend work happens. Values are deterministic (no Math.random) so the
// page looks the same on every load/hot-reload.

export type Department = 'Engineering' | 'Product & Design' | 'QA & Testing' | 'Client Operations';

export const DEPARTMENTS: Department[] = ['Engineering', 'Product & Design', 'QA & Testing', 'Client Operations'];

export type KpiTone = 'positive' | 'negative' | 'neutral';

export interface KpiCardData {
  label: string;
  value: string;
  badge?: { text: string; tone: KpiTone };
  subtext?: string;
}

export const KPI_CARDS: KpiCardData[] = [
  { label: 'Headcount & Growth', value: '84 / 100 Employees', badge: { text: '+8% vs last month', tone: 'positive' } },
  { label: 'Workforce Reliability', value: '97.6%', subtext: 'Attendance Rate', badge: { text: '-0.4%', tone: 'negative' } },
  { label: 'Turnover Index', value: '1.2%', subtext: 'Annual Attrition · 1 Voluntary, 0 Involuntary' },
  { label: 'Recruitment Speed', value: '18 Days', subtext: 'Avg. Time-to-Fill · Target: <21 Days' },
  { label: 'Workforce Sentiment', value: '4.2 / 5.0', subtext: 'eNPS Score', badge: { text: '+0.3', tone: 'positive' } },
];

export interface AttendanceTrendPoint {
  month: string;
  present: number;
  paidLeave: number;
  unapprovedAbsence: number;
}

// 6-month trailing window ending on the current reporting month.
export const ATTENDANCE_TREND: AttendanceTrendPoint[] = [
  { month: 'Apr', present: 93.8, paidLeave: 4.6, unapprovedAbsence: 1.6 },
  { month: 'May', present: 94.5, paidLeave: 4.1, unapprovedAbsence: 1.4 },
  { month: 'Jun', present: 92.9, paidLeave: 5.3, unapprovedAbsence: 1.8 },
  { month: 'Jul', present: 95.1, paidLeave: 3.8, unapprovedAbsence: 1.1 },
  { month: 'Aug', present: 96.3, paidLeave: 3.0, unapprovedAbsence: 0.7 },
  { month: 'Sep', present: 97.6, paidLeave: 2.0, unapprovedAbsence: 0.4 },
];

export interface TenureSpreadRow {
  department: Department;
  lt6mo: number;
  m6to12: number;
  y1to3: number;
  y3plus: number;
}

export const TENURE_SPREAD: TenureSpreadRow[] = [
  { department: 'Engineering', lt6mo: 6, m6to12: 8, y1to3: 14, y3plus: 9 },
  { department: 'Product & Design', lt6mo: 2, m6to12: 3, y1to3: 6, y3plus: 4 },
  { department: 'QA & Testing', lt6mo: 3, m6to12: 4, y1to3: 7, y3plus: 3 },
  { department: 'Client Operations', lt6mo: 2, m6to12: 3, y1to3: 6, y3plus: 4 },
];

export type RiskTier = 'High' | 'Medium';

export interface AttritionRisk {
  id: string;
  name: string;
  department: Department;
  riskTier: RiskTier;
  reason: string;
}

// Names here are fictional placeholders, deliberately distinct from anyone
// in the real employee roster or candidate pipeline.
export const ATTRITION_RISKS: AttritionRisk[] = [
  {
    id: 'ar1',
    name: 'Amit Verma',
    department: 'Engineering',
    riskTier: 'High',
    reason: 'Unusual spike in unapproved absences & 0 PTO taken in 6 months',
  },
  {
    id: 'ar2',
    name: 'Neha Kulkarni',
    department: 'Client Operations',
    riskTier: 'Medium',
    reason: 'Declining engagement-survey score over 2 consecutive quarters',
  },
  {
    id: 'ar3',
    name: 'Suresh Iyer',
    department: 'QA & Testing',
    riskTier: 'Medium',
    reason: 'No 1:1 check-ins logged with manager in 60+ days',
  },
];

export const COMPLIANCE_RADAR = {
  visaExpirations: 2,
  pendingPolicySignatures: 5,
  unassignedLaptops: 4,
};

export const US_CLIENT_ALIGNMENT = {
  timezoneOverlapPercent: 62,
  timezoneOverlapLabel: '~5 hrs/day overlap with EST',
  activeUsProjects: 12,
  activeUsClients: 5,
};

// --- Shared pools for generating the four deep-dive tables below ---

const FIRST_NAMES = [
  'Priya', 'Rohit', 'Ananya', 'Karthik', 'Sneha', 'Vivek', 'Isha', 'Manish', 'Divya', 'Arjun',
  'Pooja', 'Nikhil', 'Ritu', 'Sandeep', 'Kavya', 'Gaurav', 'Meera', 'Ashish', 'Tanvi', 'Rajesh',
  'Simran', 'Deepak', 'Aarti', 'Yash',
];
const LAST_NAMES = [
  'Deshmukh', 'Bhatia', 'Nair', 'Reddy', 'Joshi', 'Kapoor', 'Menon', 'Chatterjee', 'Rao', 'Malhotra',
  'Gupta', 'Pillai', 'Shetty', 'Agarwal', 'Chauhan', 'Bose', 'Krishnan', 'Sharma', 'Kulkarni', 'Verma',
  'Iyer', 'Mehta', 'Rana', 'Thakur',
];
const DESIGNATIONS = ['Associate Engineer', 'Senior Engineer', 'QA Analyst', 'Client Coordinator', 'Product Designer', 'DevOps Engineer'];

function pool<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function mockName(i: number): string {
  return `${pool(FIRST_NAMES, i)} ${pool(LAST_NAMES, i + 7)}`;
}

function mockDate(offsetDays: number): string {
  const d = new Date('2026-09-10T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

// --- Table 1: Attendance & Punctuality Ledger ---

export type AttendanceStatus = 'On Time' | 'Late' | 'Absent';

export interface AttendanceLedgerRow {
  id: string;
  name: string;
  department: Department;
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  lateByMinutes: number;
}

export const ATTENDANCE_LEDGER: AttendanceLedgerRow[] = Array.from({ length: 24 }, (_, i) => {
  const status: AttendanceStatus = i % 9 === 0 ? 'Absent' : i % 4 === 0 ? 'Late' : 'On Time';
  return {
    id: `att${i + 1}`,
    name: mockName(i),
    department: pool(DEPARTMENTS, i),
    date: mockDate(i),
    checkIn: status === 'Absent' ? '—' : status === 'Late' ? `09:${40 + (i % 15)} AM` : `09:${(i % 20).toString().padStart(2, '0')} AM`,
    checkOut: status === 'Absent' ? '—' : `06:${(10 + (i % 25)).toString().padStart(2, '0')} PM`,
    status,
    lateByMinutes: status === 'Late' ? 10 + (i % 20) : 0,
  };
});

// --- Table 2: Tenure & Mobility History ---

export type TenureBucket = '<6 mos' | '6-12 mos' | '1-3 yrs' | '3+ yrs';

export interface TenureMobilityRow {
  id: string;
  name: string;
  department: Department;
  designation: string;
  joinDate: string;
  tenureBucket: TenureBucket;
  lastPromotion: string;
}

const TENURE_BUCKETS: TenureBucket[] = ['<6 mos', '6-12 mos', '1-3 yrs', '3+ yrs'];

export const TENURE_MOBILITY: TenureMobilityRow[] = Array.from({ length: 24 }, (_, i) => ({
  id: `ten${i + 1}`,
  name: mockName(i + 3),
  department: pool(DEPARTMENTS, i + 1),
  designation: pool(DESIGNATIONS, i),
  joinDate: mockDate(200 + i * 40),
  tenureBucket: pool(TENURE_BUCKETS, i),
  lastPromotion: i % 5 === 0 ? mockDate(90 + i * 10) : '—',
}));

// --- Table 3: ATS & Recruitment Funnel ---
// Stage names match the confirmed (simplified) Sprint 13 Recruitment design,
// not a full separate ATS taxonomy, so this preview stays consistent with
// what that sprint will actually ship.

export type FunnelStage = 'Applied' | 'Screening' | 'L1 Technical' | 'L2 Final Round' | 'HR/Offer' | 'Hired' | 'Rejected';

export interface RecruitmentFunnelRow {
  id: string;
  candidate: string;
  role: string;
  source: string;
  appliedDate: string;
  stage: FunnelStage;
}

const ROLES = ['IAM Consultant', 'DevOps Engineer', 'Cloud Security Analyst', 'QA Engineer', 'Full-Stack Developer'];
const SOURCES = ['Naukri.com', 'LinkedIn', 'Referral', 'Direct Applied'];
const STAGES: FunnelStage[] = ['Applied', 'Screening', 'L1 Technical', 'L2 Final Round', 'HR/Offer', 'Hired', 'Rejected'];

export const RECRUITMENT_FUNNEL: RecruitmentFunnelRow[] = Array.from({ length: 24 }, (_, i) => ({
  id: `rec${i + 1}`,
  candidate: mockName(i + 11),
  role: pool(ROLES, i),
  source: pool(SOURCES, i),
  appliedDate: mockDate(5 + i * 6),
  stage: pool(STAGES, i),
}));

// --- Table 4: Compliance & Asset Roster ---

export type ComplianceItemType = 'Visa Renewal' | 'Policy Signature' | 'Laptop Assignment' | 'ID Card Renewal';
export type ComplianceStatus = 'Overdue' | 'Due Soon' | 'Pending' | 'Complete';

export interface ComplianceAssetRow {
  id: string;
  name: string;
  department: Department;
  itemType: ComplianceItemType;
  status: ComplianceStatus;
  dueDate: string;
}

const ITEM_TYPES: ComplianceItemType[] = ['Visa Renewal', 'Policy Signature', 'Laptop Assignment', 'ID Card Renewal'];
const COMPLIANCE_STATUSES: ComplianceStatus[] = ['Pending', 'Due Soon', 'Complete', 'Overdue'];

export const COMPLIANCE_ASSET_ROSTER: ComplianceAssetRow[] = Array.from({ length: 24 }, (_, i) => ({
  id: `cmp${i + 1}`,
  name: mockName(i + 5),
  department: pool(DEPARTMENTS, i + 2),
  itemType: pool(ITEM_TYPES, i),
  status: pool(COMPLIANCE_STATUSES, i),
  dueDate: mockDate(-10 - i * 4),
}));
