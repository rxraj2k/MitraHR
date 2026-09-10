// Centralizes every dataset the Reports & Analytics preview renders behind
// one hook, `useReportsData`, so the page component never talks to
// lib/api.ts or the mock file directly.
//
// Most of this is now real: it fetches from the /reports/preview/* endpoints
// added alongside this hook. A few pieces stay mock because the feature
// behind them doesn't exist yet — the recruitment pipeline (Sprint 13), US
// client alignment (would need a structured client region field), two
// specific KPI cards (turnover/recruitment-speed/sentiment need exit
// tracking, an ATS, and a survey feature respectively), and "pending policy
// signatures" (no acknowledgment-tracking model). Those are pulled from
// previewMockData.ts and merged in below, each one clearly identifiable
// (KPI cards carry `isMock: true`; ReportsPreview.tsx labels the rest).
import { useEffect, useMemo, useState } from 'react';
import {
  getDepartments,
  getReportsPreviewAttendanceLedger,
  getReportsPreviewAttendanceTrend,
  getReportsPreviewAttritionRisk,
  getReportsPreviewComplianceRadar,
  getReportsPreviewComplianceRoster,
  getReportsPreviewOverview,
  getReportsPreviewTenureMobility,
  getReportsPreviewTenureSpread,
} from '../../lib/api';
import {
  ReportsPreviewAttendanceLedgerRow,
  ReportsPreviewAttritionRisk,
  ReportsPreviewComplianceRadar,
  ReportsPreviewComplianceRow,
  ReportsPreviewTenureMobilityRow,
  ReportsPreviewTenureSpreadRow,
  ReportsPreviewTrendPoint,
} from '../../types';
import { KpiCardData, RECRUITMENT_FUNNEL, RecruitmentFunnelRow, STILL_MOCK_KPI_CARDS, US_CLIENT_ALIGNMENT, UsClientAlignmentSummary } from './previewMockData';

export interface ReportsData {
  kpiCards: KpiCardData[];
  attendanceTrend: ReportsPreviewTrendPoint[];
  tenureSpread: ReportsPreviewTenureSpreadRow[];
  attritionRisks: ReportsPreviewAttritionRisk[];
  complianceRadar: ReportsPreviewComplianceRadar;
  usClientAlignment: UsClientAlignmentSummary;
  attendanceLedger: ReportsPreviewAttendanceLedgerRow[];
  tenureMobility: ReportsPreviewTenureMobilityRow[];
  recruitmentFunnel: RecruitmentFunnelRow[];
  complianceAssetRoster: ReportsPreviewComplianceRow[];
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

/**
 * Fetches every real /reports/preview/* dataset in parallel, then merges in
 * the handful of pieces that are still mock (see the file-level comment).
 * `department`/`dateRange` are accepted for a future server-side-filtered
 * version of these endpoints — for now filtering happens client-side in
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
      getReportsPreviewTenureMobility(token),
      getReportsPreviewAttritionRisk(token),
      getReportsPreviewComplianceRadar(token),
      getReportsPreviewComplianceRoster(token),
      getDepartments(token),
    ])
      .then(
        ([
          overview,
          attendanceTrend,
          tenureSpread,
          attendanceLedger,
          tenureMobility,
          attritionRisks,
          complianceRadar,
          complianceAssetRoster,
          departmentLookups,
        ]) => {
          if (cancelled) return;
          const kpiCards: KpiCardData[] = [
            formatHeadcountCard(overview.headcount, overview.newJoinersThisMonth),
            formatAttendanceRateCard(overview.attendanceRatePercentThisMonth, overview.attendanceRatePercentLastMonth),
            ...STILL_MOCK_KPI_CARDS,
          ];
          const data: ReportsData = {
            kpiCards,
            attendanceTrend,
            tenureSpread,
            attritionRisks,
            complianceRadar,
            usClientAlignment: US_CLIENT_ALIGNMENT,
            attendanceLedger,
            tenureMobility,
            recruitmentFunnel: RECRUITMENT_FUNNEL,
            complianceAssetRoster,
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
