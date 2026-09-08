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

export interface EmployeeDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
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
