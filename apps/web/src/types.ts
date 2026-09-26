export type EmploymentType = 'INTERN' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type SystemRole = 'ADMINISTRATOR' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'IT_SUPPORT';
export type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

// Talent Directory (Sprint 19). ExperienceLevel is declared further down
// (reused from JobOpening/Candidate's recruitment vocabulary — an open req
// and the employee eventually hired for it describe the same seniority
// concept). deploymentStatus is staff-set rather than derived — see
// schema.prisma's comment on Employee.deploymentStatus for why.
export type DeploymentStatus = 'BILLABLE' | 'SHADOW' | 'BENCH' | 'ONBOARDING' | 'INTERNAL';

export interface LookupItem {
  id: string;
  name: string;
  // Present on Master Data list responses (Departments, Designations,
  // Skills, Work Locations, Asset Categories, Vendors, Document Types) —
  // how many other records currently reference this entry, and a plain-
  // English noun phrase for the delete-guard tooltip (e.g. "8 employees
  // assigned"). Absent on plain lookup fetches that don't need it (e.g. the
  // dropdown-only picker calls).
  usageCount?: number;
  usageLabel?: string;
  active?: boolean;
}

export interface EmployeeSkillEntry {
  id?: string;
  skillId: string;
  skill?: LookupItem;
  proficiency: Proficiency | '';
  yearsExperience: number | '';
}

export type EmployeeDocumentType =
  | 'OFFER_LETTER'
  | 'ID_PROOF'
  | 'PAN_CARD'
  | 'ACADEMIC_CERTIFICATE'
  | 'EXPERIENCE_LETTER'
  | 'CONTRACT'
  | 'CERTIFICATION'
  | 'VISA'
  | 'OTHER';

export interface EmployeeDocument {
  id: string;
  documentType: EmployeeDocumentType | string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  notes?: string | null;
  expiryDate?: string | null;
  uploadedAt: string;
}

export interface EmployeeDocumentWithOwner extends EmployeeDocument {
  employee: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    employeeCode?: string | null;
    designation?: { name: string } | null;
  };
}

export type CompanyDocumentCategory = 'POLICY' | 'TEMPLATE' | 'HANDBOOK' | 'OTHER';

export interface CompanyDocument {
  id: string;
  category: CompanyDocumentCategory | string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  description?: string | null;
  // Per-document toggle set at upload — defaults on for POLICY documents,
  // but not tied to category (Sprint 21 "Mandatory Acknowledgment" toggle).
  requiresAcknowledgment: boolean;
  uploadedAt: string;
  updatedAt: string;
  // Only populated when requiresAcknowledgment is true; null otherwise.
  acknowledgedByMe: boolean | null;
  acknowledgedCount: number | null;
  eligibleCount: number | null;
}

export interface CompanyDocumentAcknowledgment {
  employee: { id: string; fullName: string; photoUrl?: string | null };
  acknowledgedAt: string;
}

export interface CompanyDocumentAcknowledgmentStatus {
  acknowledged: CompanyDocumentAcknowledgment[];
  pending: { id: string; fullName: string; photoUrl?: string | null }[];
}

export interface DesignationHistoryEntry {
  id: string;
  fromDesignation: { name: string } | null;
  toDesignation: { name: string } | null;
  changedAt: string;
  note?: string | null;
}

export interface EmployeeManagerRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
}

export interface Employee {
  id: string;
  employeeCode?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  employmentType: EmploymentType;

  departmentId?: string | null;
  department?: LookupItem | null;
  designationId?: string | null;
  designation?: LookupItem | null;
  team?: string | null;
  workLocation?: string | null;
  reportingManagerId?: string | null;
  reportingManager?: EmployeeManagerRef | null;

  systemRole?: SystemRole | null;
  skills?: { id: string; skill: LookupItem; proficiency: Proficiency; yearsExperience: number }[];
  documents?: EmployeeDocument[];

  // Talent Directory (Sprint 19)
  experienceLevel: ExperienceLevel;
  deploymentStatus: DeploymentStatus;
  // Currently-open (endDate: null) project assignments only — see
  // EmployeesService.BASE_INCLUDE. The drawer's full past+present history
  // comes from a separate getMyProjects call instead.
  projectAssignments?: MyProjectAssignment[];

  dateOfJoining?: string | null;
  dateOfBirth?: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeInput {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  employmentType: EmploymentType;
  departmentId?: string;
  designationId?: string;
  team?: string;
  workLocation?: string;
  reportingManagerId?: string;
  systemRole?: SystemRole | '';
  experienceLevel?: ExperienceLevel;
  deploymentStatus?: DeploymentStatus;
  dateOfJoining?: string;
  dateOfBirth?: string;
  status?: EmployeeStatus;
}

export type AdminStatus = 'ACTIVE' | 'INVITED';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: AdminStatus;
  employeeId?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

// --- Leave Management ---

export type AccrualMethod = 'MONTHLY' | 'UPFRONT' | 'NONE';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type DayPart = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';
export type HolidayRegion = 'US' | 'INDIA' | 'COMPANY';
export type HolidayType = 'NATIONAL' | 'REGIONAL' | 'FLOATING';

export interface LeaveType {
  id: string;
  name: string;
  code?: string | null;
  annualQuota?: number | null;
  accrualMethod: AccrualMethod;
  isPaid: boolean;
  carryForwardAllowed: boolean;
  isCompOff: boolean;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  region: HolidayRegion;
  type: HolidayType;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode?: string | null;
  isPaid: boolean;
  annualQuota: number | null;
  accrued: number | null;
  used: number;
  remaining: number | null;
}

export interface LeaveRequestEmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: LeaveRequestEmployeeRef;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayPart: DayPart;
  totalDays: number;
  reason?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  status: LeaveRequestStatus;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

// --- Projects & Clients ---

export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface Client {
  id: string;
  name: string;
  industry?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  timezone?: string | null;
  region?: string | null;
  status: ClientStatus;
  notes?: string | null;
  createdAt: string;
  _count?: { projects: number };
}

export const CLIENT_REGIONS = ['US_EAST', 'US_CENTRAL', 'US_MOUNTAIN', 'US_PACIFIC', 'NON_US'] as const;
export type ClientRegion = (typeof CLIENT_REGIONS)[number];

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ContractType = 'T_AND_M' | 'FIXED_PRICE' | 'RETAINER' | 'MANAGED_SERVICE';
export type ProjectCategory = 'DEVOPS' | 'IAM' | 'ACTIVE_DIRECTORY' | 'CLOUD_SECURITY' | 'CYBER_SECURITY';

export interface Technology {
  id: string;
  name: string;
  category: ProjectCategory;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export interface ProjectClientRef {
  id: string;
  name: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  employee: EmployeeRef;
  roleOnProject?: string | null;
  allocationPercent: number;
  mentorRole?: 'PRIMARY' | 'SECONDARY' | null;
  startDate: string;
  endDate?: string | null;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  client: ProjectClientRef | Client;
  description?: string | null;
  status: ProjectStatus;
  contractType?: ContractType | null;
  category?: ProjectCategory | null;
  technologyId?: string | null;
  technology?: Technology | null;
  technologies?: Technology[];
  primaryMentorId?: string | null;
  primaryMentor?: EmployeeRef | null;
  secondaryMentorId?: string | null;
  secondaryMentor?: EmployeeRef | null;
  startDate?: string | null;
  targetCompletionDate?: string | null;
  endDate?: string | null;
  closureSummary?: string | null;
  createdAt: string;
  assignments?: ProjectAssignment[];
  _count?: { assignments: number };
}

export type UtilizationStatus = 'BENCH' | 'IN_TRAINING' | 'PARTIAL' | 'FULL' | 'OVER';

export interface UtilizationAssignment {
  assignmentId: string;
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  clientName: string;
  allocationPercent: number;
  roleOnProject?: string | null;
}

export interface UtilizationEntry {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  totalAllocation: number;
  status: UtilizationStatus;
  trainingTotal: number;
  trainingCompleted: number;
  assignments: UtilizationAssignment[];
}

export interface UtilizationSummary {
  total: number;
  bench: number;
  inTraining: number;
  partial: number;
  full: number;
  over: number;
}

export interface UtilizationResponse {
  employees: UtilizationEntry[];
  summary: UtilizationSummary;
}

export interface MyProjectAssignment {
  id: string;
  roleOnProject?: string | null;
  allocationPercent: number;
  startDate: string;
  endDate?: string | null;
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    client: ProjectClientRef;
  };
}

// --- Attendance ---

export type CompOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CompOffEntry {
  id: string;
  employeeId: string;
  employee?: LeaveRequestEmployeeRef;
  workedDate: string;
  daysEarned: number;
  reason: string;
  status: CompOffStatus;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface AttendanceToday {
  checkedIn: boolean;
  markedAt: string | null;
  checkedOut: boolean;
  checkOutAt: string | null;
}

export interface AttendanceSettings {
  id: string;
  expectedStartTime: string;
  // Shift start while US Daylight Saving is in effect (Sprint 18) — this
  // company's shift is aligned to fixed US client hours, so the expected
  // IST clock-in time itself shifts twice a year even though India doesn't
  // observe DST.
  expectedStartTimeDst: string;
  graceMinutes: number;
  earlyThresholdMinutes: number;
  halfDayThresholdHours: number;
  updatedAt: string;
}

export type DashboardRange = 'month' | 'quarter' | 'year';

export interface DashboardAttendanceTrendPoint {
  date: string;
  present: number;
  onLeave: number;
}

export interface DashboardDepartmentSlice {
  name: string;
  count: number;
}

export interface DashboardProjectUtilization {
  id: string;
  name: string;
  utilizationPercent: number;
  assignedCount: number;
}

export interface DashboardSummary {
  range: DashboardRange;
  headcount: number;
  newJoinersThisMonth: number;
  leaveDaysThisMonth: number;
  onLeaveToday: number;
  activeProjects: number;
  utilizationSummary: {
    total: number;
    bench: number;
    inTraining: number;
    partial: number;
    full: number;
    over: number;
  };
  assetStatusCounts: Record<string, number>;
  trainingCompletionPercent: number;
  quizAttemptsTotal: number;
  quizPassRatePercent: number;
  departmentBreakdown: DashboardDepartmentSlice[];
  projectUtilization: DashboardProjectUtilization[];
  attendanceTrend: DashboardAttendanceTrendPoint[];
}

export interface AbsenteeismRow {
  id: string;
  fullName: string;
  absentDays: number;
}

export interface AttendanceAnalyticsRow {
  id: string;
  fullName: string;
  presentDays: number;
  lateDays: number;
  halfDays: number;
}

export interface AttendanceAnalytics {
  settings: AttendanceSettings;
  rows: AttendanceAnalyticsRow[];
}

export interface ProjectClosure {
  id: string;
  name: string;
  clientName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  closureSummary: string | null;
}

// --- Reports & Analytics preview (/reports-preview) — the pieces backed by real data ---

export interface ReportsPreviewOverview {
  headcount: number;
  newJoinersThisMonth: number;
  attendanceRatePercentThisMonth: number;
  attendanceRatePercentLastMonth: number;
}

export interface ReportsPreviewTrendPoint {
  month: string;
  present: number;
  paidLeave: number;
  unapprovedAbsence: number;
}

export interface ReportsPreviewTenureSpreadRow {
  department: string;
  lt6mo: number;
  m6to12: number;
  y1to3: number;
  y3plus: number;
}

export type ReportsPreviewAttendanceStatus = 'Early' | 'On Time' | 'Late' | 'Absent';

export interface ReportsPreviewAttendanceLedgerRow {
  id: string;
  name: string;
  department: string;
  employmentType: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: ReportsPreviewAttendanceStatus;
  lateByMinutes: number;
  earlyByMinutes: number;
}

// Sprint 18: "who's logged in late, early, or on time" as its own report,
// separate from the raw per-day ledger above — trailing-30-workday totals
// plus a per-employee punctuality breakdown.
export interface ReportsPreviewAttendanceTimelinessTotals {
  early: number;
  onTime: number;
  late: number;
  absent: number;
  onTimeRatePercent: number;
}

export interface ReportsPreviewAttendanceTimelinessRow {
  id: string;
  name: string;
  department: string;
  employmentType: string;
  earlyDays: number;
  onTimeDays: number;
  lateDays: number;
  absentDays: number;
  avgLateMinutes: number;
  avgEarlyMinutes: number;
}

export interface ReportsPreviewAttendanceTimeliness {
  windowDays: number;
  expectedStartTime: string;
  expectedStartTimeDst: string;
  totals: ReportsPreviewAttendanceTimelinessTotals;
  rows: ReportsPreviewAttendanceTimelinessRow[];
}

export interface ReportsPreviewTurnover {
  turnoverRatePercent: number;
  exitsTrailing12Months: number;
}

export interface ReportsPreviewRecruitmentSpeed {
  avgTimeToFillDays: number | null;
  hiresSampled: number;
}

export interface ReportsPreviewPerformanceEngagement {
  activeCycleName: string | null;
  reviewsFinalizedCount: number;
  reviewsTotalCount: number;
  avgGoalProgressPercent: number | null;
  kudosLast30Days: number;
}

// Real recruitment-funnel rows (Sprint 18, replacing the previous mock
// table) — `stage` is one of previewMockData.ts's FunnelStage display
// labels (kept as `string` here since types.ts doesn't depend on a page
// file; the values always match).
export interface ReportsPreviewFunnelRow {
  id: string;
  candidate: string;
  role: string;
  source: string;
  appliedDate: string;
  stage: string;
}

export type ReportsPreviewTenureBucket = '<6 mos' | '6-12 mos' | '1-3 yrs' | '3+ yrs';

export interface ReportsPreviewTenureMobilityRow {
  id: string;
  name: string;
  department: string;
  employmentType: string;
  designation: string;
  joinDate: string;
  tenureBucket: ReportsPreviewTenureBucket;
  lastPromotion: string;
}

export type ReportsPreviewRiskTier = 'High' | 'Medium';

export interface ReportsPreviewAttritionRisk {
  id: string;
  name: string;
  department: string;
  riskTier: ReportsPreviewRiskTier;
  reason: string;
}

export interface ReportsPreviewComplianceRadar {
  documentsExpiringSoon: number;
  unassignedLaptops: number;
  // Real as of Sprint 16's CompanyDocumentAcknowledgment tracking — sum
  // across POLICY documents of (active employees - who's acknowledged it).
  pendingPolicySignatures: number;
}

export interface ReportsPreviewUsClientAlignment {
  timezoneOverlapPercent: number;
  timezoneOverlapLabel: string;
  activeUsProjects: number;
  activeUsClients: number;
}

export type ReportsPreviewComplianceStatus = 'Overdue' | 'Due Soon' | 'Complete';

export interface ReportsPreviewComplianceRow {
  id: string;
  name: string;
  department: string;
  itemType: string;
  status: ReportsPreviewComplianceStatus;
  dueDate: string;
}

// --- Reports audit additions (Leave Utilization, Hours & Overtime,
// Office Wall Engagement, Appraisal Cycle Status, Asset Inventory) ---

export interface ReportsPreviewLeaveTypeSlice {
  type: string;
  totalDays: number;
  requestCount: number;
}

export interface ReportsPreviewLeaveMonthPoint {
  month: string;
  byType: Record<string, number>;
}

export interface ReportsPreviewLeaveRow {
  id: string;
  name: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface ReportsPreviewLeaveUtilization {
  types: ReportsPreviewLeaveTypeSlice[];
  monthly: ReportsPreviewLeaveMonthPoint[];
  rows: ReportsPreviewLeaveRow[];
}

export interface ReportsPreviewHoursRow {
  id: string;
  name: string;
  department: string;
  daysLogged: number;
  avgHoursPerDay: number;
}

export interface ReportsPreviewCompOffRow {
  id: string;
  name: string;
  department: string;
  workedDate: string;
  daysEarned: number;
  status: string;
  reason: string;
}

export interface ReportsPreviewHoursOvertime {
  windowDays: number;
  companyAvgHoursPerDay: number | null;
  employeesWithLoggedHours: number;
  rows: ReportsPreviewHoursRow[];
  overtime: {
    windowDays: number;
    approvedInstances: number;
    totalDaysEarned: number;
    pendingApprovalCount: number;
    rows: ReportsPreviewCompOffRow[];
  };
}

export interface ReportsPreviewOfficeWallContributor {
  id: string;
  name: string;
  department: string;
  posts: number;
  likesReceived: number;
  commentsReceived: number;
}

export interface ReportsPreviewOfficeWallEngagement {
  windowDays: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  activeParticipants: number;
  engagementRatePercent: number;
  weeklyTrend: { weekOf: string; posts: number }[];
  topContributors: ReportsPreviewOfficeWallContributor[];
  byCategory: { category: string; count: number }[];
}

export interface ReportsPreviewAppraisalRow {
  id: string;
  name: string;
  department: string;
  cycleLabel: string;
  dueDate: string;
  status: string;
}

export interface ReportsPreviewAppraisalCycleStatus {
  statusCounts: Record<string, number>;
  goalStatusCounts: { status: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  ratingsSubmittedCount: number;
  rows: ReportsPreviewAppraisalRow[];
}

export interface ReportsPreviewAssetRow {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  status: string;
  assignedTo: string;
  purchaseDate: string;
}

export interface ReportsPreviewAssetInventory {
  totalAssets: number;
  unassignedCount: number;
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  rows: ReportsPreviewAssetRow[];
}

export interface SandboxEmployeeCard {
  id: string;
  fullName: string;
  employeeCode: string | null;
  photoUrl: string | null;
  departmentName: string | null;
  designationName: string | null;
  skills: string[];
  realStatus: UtilizationStatus;
  realAllocationPercent: number;
}

export interface SandboxProjectColumn {
  id: string;
  name: string;
  status: string;
  clientName: string;
  category: string | null;
}

export interface StaffingSandboxBoard {
  projects: SandboxProjectColumn[];
  columns: Record<string, SandboxEmployeeCard[]>;
}

export interface SandboxPlanChange {
  type: 'ASSIGN' | 'END';
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  assignmentId?: string;
}

export interface EmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
}

export interface LeaveDayEntry extends EmployeeRef {
  leaveTypeName: string;
  reason: string | null;
  dayPart: DayPart;
}

export interface AttendanceDay {
  date: string;
  isWeekend: boolean;
  holiday: { name: string; region: string } | null;
  present: EmployeeRef[];
  onLeave: LeaveDayEntry[];
  absent: EmployeeRef[];
  presentOnHoliday: EmployeeRef[];
  presentOnWeekend: EmployeeRef[];
}


// --- Training & Certifications ---

export type TrainingCategory =
  | 'AGILE_TOOLS'
  | 'MS365'
  | 'ZOHO_TOOLS'
  | 'SECURITY_IT'
  | 'AI_TOOLS'
  | 'GLOBAL_SKILLS'
  | 'IAM_UDEMY'
  | 'IAM_CLOUDFOUNDATION'
  | 'IAM_SECAPPS'
  | 'DEVOPS_UDEMY';
export type LearningTrack = 'MANDATORY' | 'IAM_ENGINEERING' | 'DEVOPS_ENGINEERING';
export type TrainingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface TrainingResource {
  id: string;
  label?: string | null;
  url: string;
  order: number;
}

export interface TrainingCourse {
  id: string;
  title: string;
  category: TrainingCategory;
  description?: string | null;
  restrictedTo?: string | null;
  active: boolean;
  order: number;
  resources: TrainingResource[];
  // Safe (no answers) quiz summary — null/undefined means this course has
  // no assessment yet. See QuizStaff/QuizToTake for the full authoring/taking shapes.
  quiz?: { id: string; title: string; passPercent: number; active: boolean } | null;
}

export interface EmployeeTraining {
  id: string;
  employeeId: string;
  courseId: string;
  course: TrainingCourse;
  status: TrainingStatus;
  assignedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

// --- Learning Center "Assessments" tab ---
// A quiz is scoped EITHER to one course (courseId set, track null — IAM
// Engineering and DevOps Engineering assessments) OR to a whole track
// (track set, courseId null — Mandatory Training's single assessment,
// unlocked only once every assigned Mandatory course is COMPLETED).
// subjectTitle is whichever of the course's title / the track's label
// applies, so most display code never needs to branch on which it is.

export interface QuizOptionStaff {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizQuestionStaff {
  id: string;
  text: string;
  order: number;
  options: QuizOptionStaff[];
}

// Full quiz shape as staff authors/edits it (correct answers included).
export interface QuizStaff {
  id: string;
  courseId: string | null;
  track: LearningTrack | null;
  title: string;
  passPercent: number;
  active: boolean;
  questions: QuizQuestionStaff[];
}

export interface QuizOptionPublic {
  id: string;
  text: string;
}

export interface QuizQuestionPublic {
  id: string;
  text: string;
  options: QuizOptionPublic[];
}

// What an employee fetches to take an assessment — correct answers stripped.
export interface QuizToTake {
  id: string;
  courseId: string | null;
  track: LearningTrack | null;
  subjectTitle: string;
  title: string;
  passPercent: number;
  questions: QuizQuestionPublic[];
}

// Returned by GET /training/tracks/:track/quiz-status — lets the frontend
// show Mandatory Training's single assessment card (locked/unlocked) with
// no course to key it off of.
export interface TrackQuizStatus {
  quiz: { id: string; title: string; passPercent: number } | null;
  unlocked: boolean;
  totalCourses: number;
  completedCourses: number;
}

export interface QuizAnswerSubmission {
  questionId: string;
  selectedOptionId?: string;
}

export interface QuizReviewOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizReviewQuestion {
  id: string;
  text: string;
  selectedOptionId: string | null;
  options: QuizReviewOption[];
}

// The graded result returned immediately after POST /quizzes/:id/submit —
// includes the answer key so the frontend can render a review screen.
export interface QuizSubmitResult {
  id: string;
  quizId: string;
  subjectTitle: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  submittedAt: string;
  review: QuizReviewQuestion[];
}

// One row in a results listing (admin "Assessment Results" view, or an
// employee's own "My Assessment Results" history) — already joined with
// employee/course info so the frontend needs no extra lookups.
export interface QuizResultRow {
  id: string;
  quizId: string;
  courseId: string | null;
  track: LearningTrack | null;
  subjectTitle: string;
  category: TrainingCategory | null;
  employeeId: string;
  employeeName: string;
  employeeCode?: string | null;
  employeePhotoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
}

export interface QuizDashboardStats {
  totalAttempts: number;
  passedCount: number;
  passRatePercent: number;
  avgPercent: number;
  certificatesIssued: number;
}

export interface LearningPortalCredential {
  id: string;
  name: string;
  websiteUrl: string;
  loginUrl?: string | null;
  username: string;
  passwordNote: string;
  notes?: string[];
}

export interface LearningReferenceLink {
  label: string;
  url: string;
}

export interface LearningReferenceTool {
  name: string;
  links: LearningReferenceLink[];
}

export interface LearningReferenceGroup {
  key: string;
  title: string;
  tools: LearningReferenceTool[];
}

export interface TrainingProgressEntry {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  totalAssigned: number;
  completed: number;
  inProgress: number;
  percentComplete: number;
}

// --- Asset Management ---

export type AssetCategory =
  | 'LAPTOP'
  | 'MONITOR'
  | 'PERIPHERALS'
  | 'MOBILE_PHONE'
  | 'ID_CARD'
  | 'SOFTWARE_LICENSE'
  | 'NETWORKING_EQUIPMENT'
  | 'OTHER';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_REPAIR' | 'RETIRED' | 'LOST';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface AssetEmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
}

export interface Asset {
  id: string;
  assetTag: string;
  category: AssetCategory;
  name: string;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  notes?: string | null;
  status: AssetStatus;
  assignments?: AssetAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string;
  employee?: AssetEmployeeRef;
  conditionAtAssignment: AssetCondition;
  assignedAt: string;
  returnedAt?: string | null;
  conditionAtReturn?: AssetCondition | null;
  returnNotes?: string | null;
}

export type NotificationType =
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_EDITED'
  | 'LEAVE_DECIDED'
  | 'LEAVE_CANCELLED'
  | 'COMP_OFF_SUBMITTED'
  | 'COMP_OFF_DECIDED'
  | 'TRAINING_ASSIGNED'
  | 'PROJECT_ASSIGNED'
  | 'PROJECT_ASSIGNMENT_ENDED'
  | 'ASSET_ASSIGNED'
  | 'DOCUMENT_EXPIRING'
  | 'CONTRACT_EXPIRING'
  | 'ACCESS_REVOCATION_DUE'
  | 'EXIT_INITIATED'
  | 'EXIT_COMPLETED'
  | 'APPRAISAL_DUE'
  | 'APPRAISAL_SUBMITTED'
  | 'APPRAISAL_FINALIZED'
  | 'QUIZ_RESULT'
  | 'BIRTHDAY'
  | 'RECOGNITION_RECEIVED'
  | 'PULSE_SURVEY_LAUNCHED'
  // New sign-in alert -- see AuthService.startSession. Only fires when the
  // account already has another active session at the moment of the new
  // login (i.e. someone/something signed in while you were already using
  // it elsewhere) -- not on every ordinary daily login, which would just
  // be a toast telling you about the login you're currently doing.
  | 'NEW_LOGIN'
  // Office Wall (see office-wall.service.ts) -- a new post toasts everyone
  // currently online, a tag/@mention notifies whoever was named, and a
  // like/comment notifies the post's author.
  | 'OFFICE_WALL_POST'
  | 'OFFICE_WALL_MENTION'
  | 'OFFICE_WALL_LIKE'
  | 'OFFICE_WALL_COMMENT'
  | 'OFFICE_WALL_SHARE';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface UpcomingBirthday {
  id: string;
  fullName: string;
  photoUrl?: string | null;
  daysUntil: number;
}

// --- Organization: Announcements & Favorites (Sprint 17) ---

export type AnnouncementAudienceType = 'ALL' | 'DEPARTMENTS' | 'INDIVIDUALS';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  category?: string | null;
  // One of STICKY_COLORS (lib/stickyNoteColors.ts) -- assigned server-side,
  // never user-chosen. Always present on announcements created after the
  // sticky-note redesign; optional only for defensiveness against old data.
  color?: string | null;
  pinned: boolean;
  commentsDisabled: boolean;
  audienceType: AnnouncementAudienceType | string;
  audienceDepartmentIds: string[];
  audienceEmployeeCount: number;
  expiresAt?: string | null;
  isExpired: boolean;
  createdByName: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface AnnouncementComment {
  id: string;
  body: string;
  createdAt: string;
  employee: { id: string; fullName: string; photoUrl?: string | null };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  category?: string;
  pinned?: boolean;
  commentsDisabled?: boolean;
  audienceType: AnnouncementAudienceType;
  audienceDepartmentIds?: string[];
  audienceEmployeeIds?: string[];
  expiresAt?: string;
  file?: File;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  category?: string;
  pinned?: boolean;
  commentsDisabled?: boolean;
  expiresAt?: string | null;
}

export interface FavoriteColleague {
  id: string;
  createdAt: string;
  favoriteEmployee: Employee;
}

// --- Sprint 12: Client contracts + Exit & Clearance workflow ---

export type ClientContractStatus = 'ACTIVE' | 'RENEWED' | 'TERMINATED';

export interface ClientContract {
  id: string;
  clientId: string;
  client?: { id: string; name: string };
  title: string;
  contractType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  value?: string | null;
  status: ClientContractStatus;
  notes?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContractInput {
  clientId: string;
  title: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  value?: string;
  status?: ClientContractStatus;
  notes?: string;
}

export type ExitClearanceCategory = 'IT_ASSETS' | 'ACCESS' | 'FINANCE' | 'HR' | 'ADMIN';

export interface ExitClearanceItem {
  id: string;
  exitId: string;
  category: ExitClearanceCategory;
  label: string;
  completed: boolean;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExitEmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  email: string;
  photoUrl?: string | null;
  department?: LookupItem | null;
  designation?: LookupItem | null;
}

export type EmployeeExitStatus = 'IN_PROGRESS' | 'COMPLETED';

// The five item categories fold into three department sign-off groups for
// the approval workflow — must match GROUP_CATEGORIES in
// employee-exits.service.ts on the API side.
export type ApprovalGroup = 'IT' | 'FINANCE' | 'HR_ADMIN';

export const APPROVAL_GROUP_LABELS: Record<ApprovalGroup, string> = {
  IT: 'IT & Assets',
  FINANCE: 'Finance',
  HR_ADMIN: 'HR & Admin',
};

export const APPROVAL_GROUP_CATEGORIES: Record<ApprovalGroup, ExitClearanceCategory[]> = {
  IT: ['IT_ASSETS', 'ACCESS'],
  FINANCE: ['FINANCE'],
  HR_ADMIN: ['HR', 'ADMIN'],
};

export interface ExitCategoryApproval {
  id: string;
  exitId: string;
  group: ApprovalGroup;
  approvedBy: string;
  approvedAt: string;
  notes?: string | null;
}

export interface ExitHandoverProjectRef {
  id: string;
  name: string;
  client?: { id: string; name: string } | null;
}

export interface ExitHandoverSuccessorRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
}

export interface ExitHandover {
  id: string;
  exitId: string;
  projectId: string;
  project: ExitHandoverProjectRef;
  primarySuccessorId?: string | null;
  primarySuccessor?: ExitHandoverSuccessorRef | null;
  secondarySuccessorId?: string | null;
  secondarySuccessor?: ExitHandoverSuccessorRef | null;
  notes?: string | null;
  confirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExitHandoverInput {
  projectId: string;
  primarySuccessorId?: string;
  secondarySuccessorId?: string;
  notes?: string;
  confirmed?: boolean;
}

export type ExitDocumentType = 'RESIGNATION_ACCEPTANCE' | 'RELIEVING_LETTER' | 'EXPERIENCE_CERTIFICATE' | 'NDA' | 'OTHER';

export interface ExitDocument {
  id: string;
  exitId: string;
  docType: ExitDocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

// The employee's currently-active project assignments — only present on
// the single-exit detail fetch (GET /employee-exits/:id), used to seed the
// Project & Knowledge Handover tab with a row per project even before a
// handover has been logged.
export interface ExitActiveProjectAssignment {
  id: string;
  projectId: string;
  project: ExitHandoverProjectRef;
  roleOnProject?: string | null;
  allocationPercent: number;
}

export interface EmployeeExit {
  id: string;
  employeeId: string;
  employee: ExitEmployeeRef;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  notes?: string | null;
  status: EmployeeExitStatus;
  initiatedAt: string;
  completedAt?: string | null;
  accessRevocationAt?: string | null;
  interviewCompletedAt?: string | null;
  cultureScore?: number | null;
  managementFeedback?: string | null;
  rehireEligible?: boolean | null;
  items: ExitClearanceItem[];
  approvals: ExitCategoryApproval[];
  handovers: ExitHandover[];
  documents: ExitDocument[];
  pendingAssetCount: number;
  // Only populated by the single-exit GET, not the list GET.
  activeProjects?: ExitActiveProjectAssignment[];
}

export interface InitiateExitInput {
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  notes?: string;
  accessRevocationAt?: string;
}

export interface UpdateExitInput {
  resignationDate?: string;
  lastWorkingDay?: string;
  reason?: string;
  notes?: string;
  accessRevocationAt?: string;
}

export interface UpdateExitFeedbackInput {
  interviewCompletedAt?: string;
  cultureScore?: number;
  managementFeedback?: string;
  rehireEligible?: boolean;
}

// --- Sprint 13: Recruitment ---------------------------------------------
// Started simple, then extended into a richer ATS-flavored requisition/
// pipeline (linked client/project, hiring manager, tech-stack tags,
// employment type, experience level, salary range, headcount) per
// follow-up feedback right after the first pass shipped.

export type JobOpeningStatus = 'OPEN' | 'ON_HOLD' | 'CLOSED';
export const JOB_OPENING_STATUSES: JobOpeningStatus[] = ['OPEN', 'ON_HOLD', 'CLOSED'];

// Same vocabulary as Employee's own EmploymentType, so a requisition and the
// employee eventually hired for it speak the same language.
export type JobOpeningEmploymentType = 'INTERN' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export const JOB_OPENING_EMPLOYMENT_TYPES: JobOpeningEmploymentType[] = [
  'INTERN',
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
];

export type ExperienceLevel = 'ENTRY' | 'MID' | 'SENIOR' | 'LEAD';
export const EXPERIENCE_LEVELS: ExperienceLevel[] = ['ENTRY', 'MID', 'SENIOR', 'LEAD'];

// Order matters — drives both the Kanban board's column order and the
// stage-stepper progression, mirroring the real process end to end.
// REJECTED can happen from any stage so it's kept out of the "forward"
// sequence rather than positioned as a step within it. FINAL_ROUND displays
// as "Client Round" in the UI (see STAGE_LABELS in Recruitment.tsx) now
// that it doubles as the client-facing interview for US client roles.
export type CandidateStage =
  | 'APPLIED'
  | 'SCREENING_CALL'
  | 'TECHNICAL_ROUND'
  | 'FINAL_ROUND'
  | 'OFFER_EXTENDED'
  | 'HIRED'
  | 'REJECTED';
export const CANDIDATE_FORWARD_STAGES: CandidateStage[] = [
  'APPLIED',
  'SCREENING_CALL',
  'TECHNICAL_ROUND',
  'FINAL_ROUND',
  'OFFER_EXTENDED',
  'HIRED',
];

export interface JobOpeningRef {
  id: string;
  title: string;
  refCode?: string;
  departmentId?: string | null;
}

export interface JobOpening {
  id: string;
  refCode: string;
  title: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  projectId?: string | null;
  project?: { id: string; name: string; client: { id: string; name: string } } | null;
  hiringManagerId?: string | null;
  hiringManager?: { id: string; fullName: string; employeeCode?: string | null } | null;
  technologies: { id: string; name: string }[];
  employmentType?: JobOpeningEmploymentType | null;
  experienceLevel?: ExperienceLevel | null;
  salaryRange?: string | null;
  headcountTarget: number;
  description?: string | null;
  status: JobOpeningStatus;
  openedAt: string;
  closedAt?: string | null;
  _count?: { candidates: number };
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  jobOpeningId: string;
  jobOpening?: JobOpeningRef;
  fullName: string;
  email: string;
  phone?: string | null;
  // Free text, powered by a Master Data lookup (Clients & Hiring tab) rather than a
  // closed enum -- see the schema comment on the CandidateSource model.
  source: string;
  stage: CandidateStage;
  screeningNotes?: string | null;
  screeningRating?: number | null;
  technicalNotes?: string | null;
  technicalRating?: number | null;
  finalRoundNotes?: string | null;
  finalRoundRating?: number | null;
  nextInterviewAt?: string | null;
  rejectionReason?: string | null;
  resumeFileName?: string | null;
  resumeUrl?: string | null;
  appliedAt: string;
  hiredAt?: string | null;
  convertedEmployeeId?: string | null;
  convertedEmployee?: { id: string; fullName: string; employeeCode?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobOpeningInput {
  title: string;
  departmentId?: string;
  projectId?: string;
  hiringManagerId?: string;
  technologyIds?: string[];
  employmentType?: JobOpeningEmploymentType;
  experienceLevel?: ExperienceLevel;
  salaryRange?: string;
  headcountTarget?: number;
  description?: string;
  status?: JobOpeningStatus;
}

export type UpdateJobOpeningInput = Partial<CreateJobOpeningInput>;

export interface UpdateCandidateInput {
  fullName?: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: CandidateStage;
  screeningNotes?: string;
  screeningRating?: number;
  technicalNotes?: string;
  technicalRating?: number;
  finalRoundNotes?: string;
  finalRoundRating?: number;
  nextInterviewAt?: string;
  rejectionReason?: string;
}

export interface ConvertCandidateInput {
  fullName: string;
  email: string;
  phone?: string;
  employmentType: string;
  departmentId?: string;
  dateOfJoining?: string;
}

// --- Sprint 14: Performance & Goal Management ---------------------------
// OKR-style Goals (optionally aligned under a parent goal) plus continuous
// CheckIns, framed by ReviewCycles, and formal multi-rater
// PerformanceReviews (SELF/MANAGER/PEER ReviewFeedback entries).

export type ReviewCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export const REVIEW_CYCLE_STATUSES: ReviewCycleStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED'];

export type GoalCategory = 'INDIVIDUAL' | 'TEAM' | 'COMPANY';
export const GOAL_CATEGORIES: GoalCategory[] = ['INDIVIDUAL', 'TEAM', 'COMPANY'];

export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED';
export const GOAL_STATUSES: GoalStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'];

export type CheckInConfidence = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export const CHECK_IN_CONFIDENCE_LEVELS: CheckInConfidence[] = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK'];

export type PerformanceReviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type ReviewRaterType = 'SELF' | 'MANAGER' | 'PEER' | 'CLIENT';
export const REVIEW_RATER_TYPES: ReviewRaterType[] = ['SELF', 'MANAGER', 'PEER', 'CLIENT'];

export interface ReviewCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: ReviewCycleStatus;
  _count?: { goals: number; reviews: number };
  createdAt: string;
  updatedAt: string;
}

export interface GoalEmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
}

export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  targetValue?: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  employeeId: string;
  employee?: GoalEmployeeRef;
  reviewCycleId?: string | null;
  reviewCycle?: { id: string; name: string; status: ReviewCycleStatus } | null;
  parentGoalId?: string | null;
  parentGoal?: { id: string; title: string; category: GoalCategory } | null;
  projectId?: string | null;
  project?: { id: string; name: string; client: { id: string; name: string } } | null;
  title: string;
  description?: string | null;
  category: GoalCategory;
  progress: number;
  status: GoalStatus;
  dueDate?: string | null;
  checkIns?: CheckIn[];
  keyResults: KeyResult[];
  _count?: { checkIns: number; childGoals: number };
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  employeeId: string;
  goalId?: string | null;
  progressUpdate: string;
  blockers?: string | null;
  confidence: CheckInConfidence;
  checkInDate: string;
  createdAt: string;
}

export interface ReviewFeedback {
  id: string;
  performanceReviewId: string;
  raterId: string;
  rater?: { id: string; fullName: string; employeeCode?: string | null };
  raterType: ReviewRaterType;
  communicationRating?: number | null;
  technicalRating?: number | null;
  teamworkRating?: number | null;
  goalAchievementRating?: number | null;
  comments?: string | null;
  submittedAt: string;
}

export interface PerformanceReview {
  id: string;
  reviewCycleId: string;
  reviewCycle?: ReviewCycle;
  employeeId: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode?: string | null;
    photoUrl?: string | null;
    departmentId?: string | null;
    department?: { id: string; name: string } | null;
    designation?: { id: string; name: string } | null;
  };
  status: PerformanceReviewStatus;
  overallRating?: number | null;
  potentialRating?: number | null;
  managerSummary?: string | null;
  expectedPeerReviewers: number;
  employeeAcknowledged: boolean;
  acknowledgedAt?: string | null;
  feedback: ReviewFeedback[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContextAssignment {
  id: string;
  projectId: string;
  roleOnProject?: string | null;
  allocationPercent: number;
  startDate: string;
  endDate?: string | null;
  project: { id: string; name: string; status: ProjectStatus; client: { id: string; name: string } };
}

export interface CreateReviewCycleInput {
  name: string;
  startDate: string;
  endDate: string;
}

export type UpdateReviewCycleInput = Partial<CreateReviewCycleInput> & { status?: ReviewCycleStatus };

export interface CreateGoalInput {
  employeeId?: string;
  reviewCycleId?: string;
  parentGoalId?: string;
  projectId?: string;
  title: string;
  description?: string;
  category?: GoalCategory;
  progress?: number;
  status?: GoalStatus;
  dueDate?: string;
}

export interface CreateKeyResultInput {
  title: string;
  targetValue?: string;
  order?: number;
}

export interface UpdateKeyResultInput {
  title?: string;
  targetValue?: string;
  completed?: boolean;
  order?: number;
}

export type UpdateGoalInput = Partial<Omit<CreateGoalInput, 'employeeId'>>;

export interface CreateCheckInInput {
  employeeId?: string;
  goalId?: string;
  progressUpdate: string;
  blockers?: string;
  confidence?: CheckInConfidence;
}

export interface SubmitFeedbackInput {
  raterId?: string;
  raterType: ReviewRaterType;
  communicationRating?: number;
  technicalRating?: number;
  teamworkRating?: number;
  goalAchievementRating?: number;
  comments?: string;
}

export interface FinalizeReviewInput {
  overallRating: number;
  potentialRating?: number;
  managerSummary?: string;
}

// --- Sprint 15: Employee Engagement & Feedback ---------------------------
// Peer recognition ("kudos") plus lightweight pulse surveys — both
// intentionally simple, matching this app's "free and simple but usable"
// bias. See schema.prisma's Sprint 15 comment for the full rationale.

export type RecognitionCategory = 'TEAMWORK' | 'CLIENT_IMPACT' | 'INNOVATION' | 'LEADERSHIP' | 'GOING_ABOVE_AND_BEYOND';
export const RECOGNITION_CATEGORIES: RecognitionCategory[] = [
  'TEAMWORK',
  'CLIENT_IMPACT',
  'INNOVATION',
  'LEADERSHIP',
  'GOING_ABOVE_AND_BEYOND',
];

export type RecognitionReactionType = 'LIKE' | 'CLAP' | 'FIRE' | 'ROCKET';
export const RECOGNITION_REACTION_TYPES: RecognitionReactionType[] = ['LIKE', 'CLAP', 'FIRE', 'ROCKET'];

export interface RecognitionReactionCount {
  type: RecognitionReactionType;
  count: number;
}

// Fixed reward-point tiers offered in the Give Kudos modal.
export const RECOGNITION_POINT_OPTIONS: number[] = [0, 10, 25, 50, 100];

export interface RecognitionEmployeeRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
}

export interface Recognition {
  id: string;
  fromEmployee: RecognitionEmployeeRef;
  toEmployee: RecognitionEmployeeRef;
  category: RecognitionCategory;
  message: string;
  points: number;
  createdAt: string;
  reactions: RecognitionReactionCount[];
  myReactions: RecognitionReactionType[];
  commentCount: number;
}

export interface RecognitionComment {
  id: string;
  body: string;
  createdAt: string;
  employee: { id: string; fullName: string; photoUrl?: string | null };
}

export interface RecognitionLeaderboardEntry {
  employee: RecognitionEmployeeRef;
  count: number;
  points: number;
}

export interface CreateRecognitionInput {
  toEmployeeId: string;
  category: RecognitionCategory;
  message: string;
  points?: number;
}

export type PulseSurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export const PULSE_SURVEY_STATUSES: PulseSurveyStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED'];

export type PulseSurveyAudienceType = 'ALL' | 'DEPARTMENTS';

export type PulseQuestionType = 'RATING' | 'YES_NO' | 'TEXT';
export const PULSE_QUESTION_TYPES: PulseQuestionType[] = ['RATING', 'YES_NO', 'TEXT'];

export interface PulseSurveyQuestion {
  id: string;
  text: string;
  type: PulseQuestionType;
  order: number;
}

export interface PulseSurveyAnswer {
  id: string;
  questionId: string;
  ratingValue?: number | null;
  boolValue?: boolean | null;
  textValue?: string | null;
}

export interface PulseSurvey {
  id: string;
  title: string;
  description?: string | null;
  status: PulseSurveyStatus;
  audienceType: PulseSurveyAudienceType;
  audienceDepartmentIds: string[];
  closesAt?: string | null;
  createdByName?: string;
  createdAt: string;
  questions: PulseSurveyQuestion[];
  responseCount: number;
  eligibleCount: number;
  respondedByMe: boolean;
}

export interface PulseSurveyDetail extends PulseSurvey {
  myAnswers: PulseSurveyAnswer[] | null;
}

export interface PulseSurveyQuestionResult {
  questionId: string;
  text: string;
  type: PulseQuestionType;
  average?: number | null;
  distribution?: number[];
  yes?: number;
  no?: number;
  responses?: string[];
  responseCount: number;
}

export interface PulseSurveyResults {
  surveyId: string;
  title: string;
  status: PulseSurveyStatus;
  eligibleCount: number;
  responseCount: number;
  responseRatePercent: number;
  questions: PulseSurveyQuestionResult[];
}

export interface PulseQuestionInput {
  text: string;
  type: PulseQuestionType;
}

export interface CreatePulseSurveyInput {
  title: string;
  description?: string;
  audienceType?: PulseSurveyAudienceType;
  audienceDepartmentIds?: string[];
  closesAt?: string;
  questions: PulseQuestionInput[];
}

export interface UpdatePulseSurveyInput {
  title?: string;
  description?: string;
  status?: PulseSurveyStatus;
  closesAt?: string | null;
}

export interface PulseAnswerInput {
  questionId: string;
  ratingValue?: number;
  boolValue?: boolean;
  textValue?: string;
}

// eNPS-style engagement snapshot for the Pulse Surveys tab header.
export type PulseFeedbackSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEEDS_ATTENTION';

export interface PulseInsightsTrendPoint {
  label: string;
  score: number;
}

export interface PulseInsightsFeedbackItem {
  text: string;
  sentiment: PulseFeedbackSentiment;
  surveyTitle: string;
  submittedAt: string;
}

export interface PulseSurveyInsights {
  enpsScore: number;
  sentimentLabel: 'Healthy' | 'Needs Attention' | 'Critical';
  promoterPercent: number;
  passivePercent: number;
  detractorPercent: number;
  totalRatingResponses: number;
  trend: PulseInsightsTrendPoint[];
  feedback: PulseInsightsFeedbackItem[];
}

// --- Master Data: new lookup categories (Assets & Docs, Locations tabs) ---

export interface WorkLocation {
  id: string;
  name: string;
  region?: string | null;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export type AssetCategoryKind = 'HARDWARE' | 'SOFTWARE';

export interface AssetCategoryItem {
  id: string;
  name: string;
  kind: AssetCategoryKind;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export interface AssetVendorItem {
  id: string;
  name: string;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export interface ContractTypeItem {
  id: string;
  name: string;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export interface CandidateSourceItem {
  id: string;
  name: string;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

export type DocumentTypeAppliesTo = 'EMPLOYEE' | 'COMPANY';

export interface DocumentTypeItem {
  id: string;
  name: string;
  appliesTo: DocumentTypeAppliesTo;
  active: boolean;
  usageCount?: number;
  usageLabel?: string;
}

// --- Semi-annual Self-Appraisal & Compensation Review -----------------

export interface AppraisalCriterion {
  id: string;
  name: string;
  description?: string | null;
  weight: number;
  sortOrder: number;
  active: boolean;
  // Present on the Master Data list response: how many AppraisalCriterionScore
  // rows reference this criterion, mirroring every other lookup's usage badge.
  usageCount?: number;
  usageLabel?: string;
}

export type AppraisalStatus = 'PENDING_EMPLOYEE' | 'UNDER_MANAGER_REVIEW' | 'COMPLETED';

export interface AppraisalCriterionEntry {
  criterionId: string;
  name: string;
  description?: string | null;
  weight: number;
  selfRating: number | null;
  selfComment?: string | null;
  managerRating: number | null;
  managerComment?: string | null;
}

export interface AppraisalEmployeeCard {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string | null;
  employeeCode?: string | null;
  currentCTC?: number | null;
  dateOfJoining?: string | null;
  department?: { name: string } | null;
  designation?: { name: string } | null;
}

// Shape returned to the employee themselves (my-performance).
export interface MyAppraisal {
  id: string;
  cycleNumber: number;
  cycleLabel: string;
  dueDate: string;
  status: AppraisalStatus;
  emailSentAt?: string | null;
  selfSubmittedAt?: string | null;
  selfWeightedScore: number | null;
  managerWeightedScore: number | null;
  currentCTC: number | null;
  incrementPercent: number | null;
  incrementAmount: number | null;
  revisedCTC: number | null;
  effectiveDate: string | null;
  finalizedAt?: string | null;
  careerGoals?: string | null;
  managementSupport?: string | null;
  certifications?: string | null;
  skillsAcquired: { id: string; name: string }[];
  criteria: AppraisalCriterionEntry[];
}

// Shape returned to admins (dashboard row + full review detail).
export interface AdminAppraisalRow {
  id: string;
  employee: AppraisalEmployeeCard;
  cycleNumber: number;
  cycleLabel: string;
  dueDate: string;
  status: AppraisalStatus;
  emailSentAt?: string | null;
  selfSubmittedAt?: string | null;
  selfWeightedScore: number | null;
  managerWeightedScore: number | null;
  revisedCTC: number | null;
}

export interface AdminAppraisalDetail extends AdminAppraisalRow {
  careerGoals?: string | null;
  managementSupport?: string | null;
  certifications?: string | null;
  skillsAcquired: { id: string; name: string }[];
  managerReviewedByName?: string | null;
  managerReviewedAt?: string | null;
  finalizedByName?: string | null;
  finalizedAt?: string | null;
  currentCTC: number | null;
  incrementPercent: number | null;
  incrementAmount: number | null;
  effectiveDate: string | null;
  criteria: AppraisalCriterionEntry[];
}

// --- Admin Center ---
// See AdminSettings model comment (apps/api/prisma/schema.prisma) for
// which of these fields are actually enforced vs. policy-only today.
export interface AdminSettings {
  enforceMfaForAdmins: boolean;
  passwordExpiryDays: number;
  sessionIdleTimeoutMin: number;
  ipWhitelist: string;
  appraisalEmailEnabled: boolean;
  assetAssignmentNoticeEnabled: boolean;
  documentExpiryAlertEnabled: boolean;
  appraisalEmailSubjectTemplate?: string | null;
  appraisalEmailBodyTemplate?: string | null;
  backupSchedule: 'NONE' | 'DAILY' | 'WEEKLY';
  lastBackupAt?: string | null;
}

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  module: string;
  action: string;
  description: string;
  severity: AuditSeverity;
  ipAddress?: string | null;
}

export interface SystemHealth {
  employeeCount: number;
  adminCount: number;
  auditLogCount: number;
  dbSizeBytes: number | null;
  recentLogins24h: number;
  backupSchedule: 'NONE' | 'DAILY' | 'WEEKLY';
  lastBackupAt?: string | null;
}

// Live User Activity (Data & System Health) -- real per-login sessions, see
// UserSession's model comment (apps/api/prisma/schema.prisma).
export type LiveSessionStatus = 'ACTIVE' | 'AWAY' | 'LOGGED_OUT';

export interface LiveSessionEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  userKind: 'STAFF' | 'EMPLOYEE';
  status: LiveSessionStatus;
  statusLabel: string;
  ipAddress: string | null;
  device: string;
  loginAt: string;
  lastSeenAt: string;
  durationLabel: string;
  canForceEnd: boolean;
}

export interface LiveActivity {
  summary: {
    activeCount: number;
    awayCount: number;
    loggedOutCount24h: number;
    awayThresholdMin: number;
  };
  sessions: LiveSessionEntry[];
}
// --- Office Wall: a free-form internal social feed (see
// office-wall.service.ts for how it differs from Announcements/Recognition) ---

export const OFFICE_WALL_CATEGORIES = ['GENERAL', 'SHOUTOUT', 'MILESTONE', 'ANNOUNCEMENT', 'EVENT'] as const;
export type OfficeWallCategory = (typeof OFFICE_WALL_CATEGORIES)[number];

export const OFFICE_WALL_REACTION_TYPES = ['LIKE', 'HEART', 'CELEBRATE', 'HANDS_UP'] as const;
export type OfficeWallReactionType = (typeof OFFICE_WALL_REACTION_TYPES)[number];

export interface OfficeWallPersonRef {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  photoUrl?: string | null;
  department?: { name: string } | null;
  designation?: { name: string } | null;
  online?: boolean;
}

export interface OfficeWallMedia {
  id: string;
  url: string;
  fileName: string;
}

export interface OfficeWallReactionCount {
  type: OfficeWallReactionType;
  count: number;
}

export interface OfficeWallMentionRef {
  id: string;
  fullName: string;
}

export interface OfficeWallPost {
  id: string;
  author: OfficeWallPersonRef;
  body: string;
  category: OfficeWallCategory | string;
  taggedEmployee?: OfficeWallPersonRef | null;
  media: OfficeWallMedia[];
  mentions: OfficeWallMentionRef[];
  createdAt: string;
  reactions: OfficeWallReactionCount[];
  myReactions: string[];
  commentCount: number;
  canDelete: boolean;
}

export interface OfficeWallComment {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  employee: { id: string; fullName: string; photoUrl?: string | null };
}

export interface OfficeWallPresenceEntry {
  id: string;
  fullName: string;
  photoUrl: string | null;
  department: string | null;
  designation: string | null;
}
