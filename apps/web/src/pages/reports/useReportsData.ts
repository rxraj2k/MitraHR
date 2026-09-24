// Centralizes every dataset the Reports & Analytics preview renders behind
// one hook, `useReportsData`, so the page component never talks to
// lib/api.ts or the mock file directly.
//
// As of Sprint 18, every dataset here is real — it fetches from the
// /reports/preview/* endpoints, each backed by the feature that landed for
// it (Client.region for US Client Alignment, CompanyDocumentAcknowledgment
// for Pending Policy Signatures, DesignationHistory for Last Promotion,
// Candidate/JobOpening for Recruitment Speed & the Funnel tab,
// EmployeeExit for Turnover, ReviewCycle/Goal/Recognition for the
// Performance & Engagement widget, and the DST-aware AttendanceSettings for
// the new Attendance Timeliness tab). The only two "isMock" cards left are
// graceful empty states (see previewMockData.ts) shown before a feature has
// any data yet — Workforce Sentiment before any pulse-survey rating comes
// in, Recruitment Speed before anyone's been hired through the ATS — not
// fabricated numbers.
import { useEffect, useMemo, useState } from 'react';
import {
  getDepartments,
  getPulseSurveyInsights,
  getReportsPreviewAttendanceLedger,
  getReportsPreviewAttendanceTimeliness,
  getReportsPreviewAttendanceTrend,
  getReportsPreviewAttritionRisk,
  getReportsPreviewComplianceRadar,
  getReportsPreviewComplianceRoster,
  getReportsPreviewOverview,
  getReportsPreviewPerformanceEngagement,
  getReportsPreviewRecruitmentFunnel,
  getReportsPreviewRecruitmentSpeed,
  getReportsPreviewTenureMobility,
  getReportsPreviewTenureSpread,
  getReportsPreviewTurnover,
  getReportsPreviewUsClientAlignment,
} from '../../lib/api';
import {
  PulseSurveyInsights,
  ReportsPreviewAttendanceLedgerRow,
  ReportsPreviewAttendanceTimeliness,
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
import { KpiCardData, KpiTone, MOCK_RECRUITMENT_SPEED_CARD, MOCK_WORKFORCE_SENTIMENT_CARD } from './previewMockData';

export interface ReportsData {
  kpiCards: KpiCardData[];
  attendanceTrend: ReportsPreviewTrendPoint[];
  tenureSpread: ReportsPreviewTenureSpreadRow[];
  attritionRisks: ReportsPreviewAttritionRisk[];
  complianceRadar: ReportsPreviewComplianceRadar;
  usClientAlignment: ReportsPreviewUsClientAlignment;
  attendanceLedger: ReportsPreviewAttendanceLedgerRow[];
  attendanceTimeliness: ReportsPreviewAttendanceTimeliness;
  tenureMobility: ReportsPreviewTenureMobilityRow[];
  recruitmentFunnel: ReportsPreviewFunnelRow[];
  complianceAssetRoster: ReportsPreviewComplianceRow[];
  performanceEngagement: ReportsPreviewPerformanceEngagement;
  departments: string[];
}

export interface UseReportsDataResult {
  data: ReportsData | null;
  loading: boolean;
  error: string | null;
}

function formatAttendanceRateCard(thisMonth: number, lastMonth: number): KpiCardData {
  const delta = Math.round((thisMonth - lastMonth) * 10) / 10;
  return {
    label: 'Workforce Reliability',
    value: `${thisMonth}%`,
    subtext: 'Attendance Rate (this month)',
    badge:
      delta === 0
        ? undefined
        : { text: `${delta > 0 ? '+' : ''}${delta}% vs last month`, tone: delta > 0 ? 'positive' : 'negative' },
  };
}

function formatHeadcountCard(headcount: number, newJoiners: number): KpiCardData {
  return {
    label: 'Headcount & Growth',
    value: `${headcount} Employees`,
    badge: newJoiners > 0 ? { text: `+${newJoiners} this month`, tone: 'positive' } : undefined,
  };
}

function formatWorkforceSentimentCard(insights: PulseSurveyInsights): KpiCardData {
  if (insights.totalRatingResponses === 0) return MOCK_WORKFORCE_SENTIMENT_CARD;
  const tone: KpiTone = insights.sentimentLabel === 'Healthy' ? 'positive' : insights.sentimentLabel === 'Critical' ? 'negative' : 'neutral';
  return {
    label: 'Workforce Sentiment',
    value: `${insights.enpsScore > 0 ? '+' : ''}${insights.enpsScore} eNPS`,
    subtext: `From ${insights.totalRatingResponses} rating response${insights.totalRatingResponses === 1 ? '' : 's'}`,
    badge: { text: insights.sentimentLabel, tone },
  };
}

// Trailing-12-month exits over (active headcount + those exits) — see
// ReportsService.previewTurnover for why this reports one overall rate
// rather than a voluntary/involuntary split EmployeeExit's free-text
// `reason` field can't actually back.
function formatTurnoverCard(turnover: { turnoverRatePercent: number; exitsTrailing12Months: number }): KpiCardData {
  return {
    label: 'Turnover Index',
    value: `${turnover.turnoverRatePercent}%`,
    subtext: `${turnover.exitsTrailing12Months} exit${turnover.exitsTrailing12Months === 1 ? '' : 's'} · trailing 12 months`,
  };
}

function formatRecruitmentSpeedCard(speed: { avgTimeToFillDays: number | null; hiresSampled: number }): KpiCardData {
  if (speed.avgTimeToFillDays === null) return MOCK_RECRUITMENT_SPEED_CARD;
  return {
    label: 'Recruitment Speed',
    value: `${speed.avgTimeToFillDays} Days`,
    subtext: `Avg. Time-to-Fill · last ${speed.hiresSampled} hire${speed.hiresSampled === 1 ? '' : 's'}`,
  };
}

/**
 * Fetches every /reports/preview/* dataset in parallel. `department`/
 * `dateRange` are accepted for a future server-side-filtered version of
 * these endpoints — for now filtering happens client-side in
 * ReportsPreview.tsx, same as before.
 */
export function useReportsData(token: string | null): UseReportsDataResult {
  const [state, setState] = useState<{ data: ReportsData | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.all([
      getReportsPreviewOverview(token),
      getReportsPreviewAttendanceTrend(token),
      getReportsPreviewTenureSpread(token),
      getReportsPreviewAttendanceLedger(token),
      getReportsPreviewAttendanceTimeliness(token),
      getReportsPreviewTenureMobility(token),
      getReportsPreviewAttritionRisk(token),
      getReportsPreviewComplianceRadar(token),
      getReportsPreviewComplianceRoster(token),
      getReportsPreviewUsClientAlignment(token),
      getReportsPreviewTurnover(token),
      getReportsPreviewRecruitmentSpeed(token),
      getReportsPreviewRecruitmentFunnel(token),
      getReportsPreviewPerformanceEngagement(token),
      getPulseSurveyInsights(token),
      getDepartments(token),
    ])
      .then(
        ([
          overview,
          attendanceTrend,
          tenureSpread,
          attendanceLedger,
          attendanceTimeliness,
          tenureMobility,
          attritionRisks,
          complianceRadar,
          complianceAssetRoster,
          usClientAlignment,
          turnover,
          recruitmentSpeed,
          recruitmentFunnel,
          performanceEngagement,
          pulseInsights,
          departmentLookups,
        ]) => {
          if (cancelled) return;
          const kpiCards: KpiCardData[] = [
            formatHeadcountCard(overview.headcount, overview.newJoinersThisMonth),
            formatAttendanceRateCard(overview.attendanceRatePercentThisMonth, overview.attendanceRatePercentLastMonth),
            formatTurnoverCard(turnover),
            formatRecruitmentSpeedCard(recruitmentSpeed),
            formatWorkforceSentimentCard(pulseInsights),
          ];
          const data: ReportsData = {
            kpiCards,
            attendanceTrend,
            tenureSpread,
            attritionRisks,
            complianceRadar,
            usClientAlignment,
            attendanceLedger,
            attendanceTimeliness,
            tenureMobility,
            recruitmentFunnel,
            complianceAssetRoster,
            performanceEngagement,
            departments: departmentLookups.map((d) => d.name).sort((a, b) => a.localeCompare(b)),
          };
          setState({ data, loading: false, error: null });
        },
      )
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: err.message || 'Failed to load reports data' });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return useMemo(() => state, [state]);
}
