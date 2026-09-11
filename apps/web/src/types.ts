export type EmploymentType = 'INTERN' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type SystemRole = 'ADMINISTRATOR' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'IT_SUPPORT';
export type Proficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface LookupItem {
  id: string;
  name: string;
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
  | 'OTHER';

export interface EmployeeDocument {
  id: string;
  documentType: EmployeeDocumentType | string;
  fileName: string;
  fileUrl: string;
  expiryDate?: string | null;
  uploadedAt: string;
}

export interface EmployeeDocumentWithOwner extends EmployeeDocument {
  employee: { id: string; fullName: string; photoUrl?: string | null; employeeCode?: string | null };
}

export type CompanyDocumentCategory = 'POLICY' | 'TEMPLATE' | 'HANDBOOK' | 'OTHER';

export interface CompanyDocument {
  id: string;
  category: CompanyDocumentCategory | string;
  title: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  updatedAt: string;
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
}

// --- Leave Management ---

export type AccrualMethod = 'MONTHLY' | 'UPFRONT' | 'NONE';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type DayPart = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';
export type HolidayRegion = 'US' | 'INDIA' | 'COMPANY';

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
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  region: HolidayRegion;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
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
  status: ClientStatus;
  notes?: string | null;
  createdAt: string;
  _count?: { projects: number };
}

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ContractType = 'T_AND_M' | 'FIXED_PRICE' | 'RETAINER' | 'MANAGED_SERVICE';
export type ProjectCategory = 'DEVOPS' | 'IAM' | 'ACTIVE_DIRECTORY' | 'CLOUD_SECURITY' | 'CYBER_SECURITY';

export interface Technology {
  id: string;
  name: string;
  category: ProjectCategory;
  active: boolean;
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
  primaryMentorId?: string | null;
  primaryMentor?: EmployeeRef | null;
  secondaryMentorId?: string | null;
  secondaryMentor?: EmployeeRef | null;
  startDate?: string | null;
  endDate?: string | null;
  closureSummary?: string | null;
  createdAt: string;
  assignments?: ProjectAssignment[];
  _count?: { assignments: number };
}

export type UtilizationStatus = 'BENCH' | 'IN_TRAINING' | 'PARTIAL' | 'FULL' | 'OVER';

export interface UtilizationAssignment {
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
  graceMinutes: number;
  halfDayThresholdHours: number;
  updatedAt: string;
}

export interface DashboardSummary {
  headcount: number;
  newJoinersThisMonth: number;
  leaveDaysThisMonth: number;
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

export type ReportsPreviewAttendanceStatus = 'On Time' | 'Late' | 'Absent';

export interface ReportsPreviewAttendanceLedgerRow {
  id: string;
  name: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: ReportsPreviewAttendanceStatus;
  lateByMinutes: number;
}

export type ReportsPreviewTenureBucket = '<6 mos' | '6-12 mos' | '1-3 yrs' | '3+ yrs';

export interface ReportsPreviewTenureMobilityRow {
  id: string;
  name: string;
  department: string;
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
  // null = not tracked yet (no policy-acknowledgment model exists) rather
  // than a made-up count.
  pendingPolicySignatures: number | null;
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

export interface SandboxEmployeeCard {
  id: string;
  fullName: string;
  employeeCode: string | null;
  photoUrl: string | null;
  departmentName: string | null;
  designationName: string | null;
}

export interface SandboxProjectColumn {
  id: string;
  name: string;
  status: string;
  clientName: string;
}

export interface StaffingSandboxBoard {
  projects: SandboxProjectColumn[];
  columns: Record<string, SandboxEmployeeCard[]>;
}

export interface EmployeeRef {
  id: string;
  fullName: string;
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

export type TrainingCategory = 'AGILE_TOOLS' | 'MS365' | 'ZOHO_TOOLS' | 'SECURITY_IT' | 'AI_TOOLS' | 'GLOBAL_SKILLS';
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
  | 'LEAVE_DECIDED'
  | 'COMP_OFF_SUBMITTED'
  | 'COMP_OFF_DECIDED'
  | 'TRAINING_ASSIGNED'
  | 'PROJECT_ASSIGNED'
  | 'PROJECT_ASSIGNMENT_ENDED'
  | 'ASSET_ASSIGNED'
  | 'DOCUMENT_EXPIRING'
  | 'BIRTHDAY';

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
