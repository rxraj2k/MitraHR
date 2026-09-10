// Hardcoded mock data for the parts of the Reports & Analytics preview
// (see ReportsPreview.tsx) that don't have a real feature to draw on yet:
// the recruitment pipeline (Sprint 13, not built), a couple of KPI cards
// (turnover/recruitment-speed/sentiment need features that don't exist —
// exit tracking, an ATS, an engagement survey), and US client alignment
// (would need a structured client region/timezone-classification field,
// which Client.timezone today is not — it's free text). Everything else
// this page shows comes from useReportsData.ts's real API calls.

export type KpiTone = 'positive' | 'negative' | 'neutral';

export interface KpiCardData {
  label: string;
  value: string;
  badge?: { text: string; tone: KpiTone };
  subtext?: string;
  // True for a card whose value is still hardcoded (no backing feature
  // yet) — ReportsPreview renders a small "Preview data" tag on these.
  isMock?: boolean;
}

// Still mock: Headcount & Growth and Workforce Reliability are computed
// for real in useReportsData.ts and take the first two slots in the row.
export const STILL_MOCK_KPI_CARDS: KpiCardData[] = [
  { label: 'Turnover Index', value: '1.2%', subtext: 'Annual Attrition · 1 Voluntary, 0 Involuntary', isMock: true },
  { label: 'Recruitment Speed', value: '18 Days', subtext: 'Avg. Time-to-Fill · Target: <21 Days', isMock: true },
  { label: 'Workforce Sentiment', value: '4.2 / 5.0', subtext: 'eNPS Score', badge: { text: '+0.3', tone: 'positive' }, isMock: true },
];

export interface UsClientAlignmentSummary {
  timezoneOverlapPercent: number;
  timezoneOverlapLabel: string;
  activeUsProjects: number;
  activeUsClients: number;
}

export const US_CLIENT_ALIGNMENT: UsClientAlignmentSummary = {
  timezoneOverlapPercent: 62,
  timezoneOverlapLabel: '~5 hrs/day overlap with EST',
  activeUsProjects: 12,
  activeUsClients: 5,
};

// Real attendance-ledger rows use this same status vocabulary.
export type AttendanceStatus = 'On Time' | 'Late' | 'Absent';
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['On Time', 'Late', 'Absent'];

// --- Shared pools for generating the one table below that's still mock ---

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

// --- ATS & Recruitment Funnel — still 100% mock ---
// Stage names match the confirmed (simplified) Sprint 13 Recruitment design,
// not a full separate ATS taxonomy, so this preview stays consistent with
// what that sprint will actually ship. There's no Candidate model yet, so
// this whole tab stays mock until that sprint is built.

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
export const FUNNEL_STAGES: FunnelStage[] = ['Applied', 'Screening', 'L1 Technical', 'L2 Final Round', 'HR/Offer', 'Hired', 'Rejected'];

export const RECRUITMENT_FUNNEL: RecruitmentFunnelRow[] = Array.from({ length: 24 }, (_, i) => ({
  id: `rec${i + 1}`,
  candidate: mockName(i + 11),
  role: pool(ROLES, i),
  source: pool(SOURCES, i),
  appliedDate: mockDate(5 + i * 6),
  stage: pool(FUNNEL_STAGES, i),
}));
