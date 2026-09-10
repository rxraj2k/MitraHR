// Centralizes every mock dataset the Reports & Analytics preview renders
// behind one hook, `useReportsData`, so the page component never imports
// mock arrays directly. The point isn't behavior (it still just returns the
// same hardcoded snapshot synchronously) — it's shape: `ReportsQueryParams`
// and `ReportsData` describe exactly what a real endpoint would take and
// return, and the { data, loading, error } return matches the same
// async-fetch convention the rest of the app already uses in lib/api.ts.
//
// Swapping this for the real backend later should only mean rewriting the
// inside of this one function — e.g. a `useEffect` that calls something like
// `getReportsDashboard(params)` from lib/api.ts (mirroring the existing
// getAbsenteeismReport / getAttendanceAnalytics pattern) and setting loading
// /error/data from the response — without touching ReportsPreview.tsx itself.
import { useMemo, useState } from 'react';
import {
  ATTENDANCE_LEDGER,
  ATTENDANCE_TREND,
  ATTRITION_RISKS,
  AttendanceLedgerRow,
  AttendanceTrendPoint,
  AttritionRisk,
  COMPLIANCE_ASSET_ROSTER,
  COMPLIANCE_RADAR,
  ComplianceAssetRow,
  ComplianceRadarSummary,
  Department,
  KPI_CARDS,
  KpiCardData,
  RECRUITMENT_FUNNEL,
  RecruitmentFunnelRow,
  TENURE_MOBILITY,
  TENURE_SPREAD,
  TenureMobilityRow,
  TenureSpreadRow,
  US_CLIENT_ALIGNMENT,
  UsClientAlignmentSummary,
} from './previewMockData';

export interface ReportsQueryParams {
  /** One of the Date Range selector's option labels (see DATE_RANGES). */
  dateRange: string;
  /** 'All Departments' or one specific department to scope every dataset to. */
  department: Department | 'All Departments';
}

export interface ReportsData {
  kpiCards: KpiCardData[];
  attendanceTrend: AttendanceTrendPoint[];
  tenureSpread: TenureSpreadRow[];
  attritionRisks: AttritionRisk[];
  complianceRadar: ComplianceRadarSummary;
  usClientAlignment: UsClientAlignmentSummary;
  attendanceLedger: AttendanceLedgerRow[];
  tenureMobility: TenureMobilityRow[];
  recruitmentFunnel: RecruitmentFunnelRow[];
  complianceAssetRoster: ComplianceAssetRow[];
}

export interface UseReportsDataResult {
  data: ReportsData;
  loading: boolean;
  error: string | null;
}

/**
 * Single source of truth for every number/row this page renders.
 *
 * TODO(backend): once the real endpoints exist, this becomes something like:
 *
 *   const [data, setData] = useState<ReportsData | null>(null);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState<string | null>(null);
 *   useEffect(() => {
 *     setLoading(true);
 *     getReportsDashboard(params)
 *       .then(setData)
 *       .catch((e) => setError(e.message))
 *       .finally(() => setLoading(false));
 *   }, [params.dateRange, params.department]);
 *
 * `params` is accepted (and typed) now so that effect can be dropped in
 * without changing this hook's signature or its caller.
 */
export function useReportsData(params: ReportsQueryParams): UseReportsDataResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dateRange, department } = params; // not yet used — mock data doesn't vary by query, real data will.

  const [snapshot] = useState<ReportsData>(() => ({
    kpiCards: KPI_CARDS,
    attendanceTrend: ATTENDANCE_TREND,
    tenureSpread: TENURE_SPREAD,
    attritionRisks: ATTRITION_RISKS,
    complianceRadar: COMPLIANCE_RADAR,
    usClientAlignment: US_CLIENT_ALIGNMENT,
    attendanceLedger: ATTENDANCE_LEDGER,
    tenureMobility: TENURE_MOBILITY,
    recruitmentFunnel: RECRUITMENT_FUNNEL,
    complianceAssetRoster: COMPLIANCE_ASSET_ROSTER,
  }));

  // useMemo (rather than returning a fresh object every render) so a future
  // real implementation can safely list `data` in dependency arrays without
  // causing extra re-fetches from identity churn alone.
  return useMemo(() => ({ data: snapshot, loading: false, error: null }), [snapshot]);
}
