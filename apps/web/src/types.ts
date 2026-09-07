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
  status: LeaveRequestStatus;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

// --- Attendance ---

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
