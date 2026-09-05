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
