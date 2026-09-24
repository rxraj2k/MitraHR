// As of Sprint 18, everything the Reports & Analytics preview shows is real
// — every KPI card, both attendance tabs, and the recruitment funnel now
// draw on live data via useReportsData.ts. What's left here is genuinely
// generic UI vocabulary (KpiCardData's shape, the attendance/funnel status
// orderings used by filter dropdowns) plus two graceful empty-state
// fallbacks for features that exist but may not have data yet (no pulse
// survey responses; nobody hired through the ATS yet) — never fabricated
// numbers.

export type KpiTone = 'positive' | 'negative' | 'neutral';

export interface KpiCardData {
  label: string;
  value: string;
  badge?: { text: string; tone: KpiTone };
  subtext?: string;
  // True only for a graceful "no data yet" placeholder (see the two
  // fallbacks below) — ReportsPreview renders a small "Preview data" tag
  // on these. Nothing on this page fabricates a number anymore.
  isMock?: boolean;
}

// Fallback only — shown until at least one pulse-survey rating response
// exists, at which point useReportsData.ts swaps in the real eNPS score
// from getPulseSurveyInsights (see formatWorkforceSentimentCard).
export const MOCK_WORKFORCE_SENTIMENT_CARD: KpiCardData = {
  label: 'Workforce Sentiment',
  value: '—',
  subtext: 'eNPS Score · no survey responses yet',
  isMock: true,
};

// Fallback only — shown until someone has actually been hired through the
// Recruitment/ATS module, at which point useReportsData.ts swaps in the
// real average time-to-fill (see formatRecruitmentSpeedCard).
export const MOCK_RECRUITMENT_SPEED_CARD: KpiCardData = {
  label: 'Recruitment Speed',
  value: '—',
  subtext: 'Avg. Time-to-Fill · no hires recorded yet',
  isMock: true,
};

// Real attendance-ledger rows use this same status vocabulary (Sprint 18
// added Early alongside the original On Time/Late/Absent).
export type AttendanceStatus = 'Early' | 'On Time' | 'Late' | 'Absent';
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['Early', 'On Time', 'Late', 'Absent'];

// Real recruitment-funnel rows (Sprint 18 — previously mock) use this same
// stage vocabulary/order for the Kanban-style filter dropdown. Labels match
// what Recruitment/ATS (Sprint 13) already calls these stages, including
// its "Client Round" relabeling of the underlying FINAL_ROUND value.
export type FunnelStage = 'Applied' | 'Screening' | 'L1 Technical' | 'L2 Final Round' | 'HR/Offer' | 'Hired' | 'Rejected';
export const FUNNEL_STAGES: FunnelStage[] = ['Applied', 'Screening', 'L1 Technical', 'L2 Final Round', 'HR/Offer', 'Hired', 'Rejected'];
