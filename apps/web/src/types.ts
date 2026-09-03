export type EmploymentType = 'INTERN' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface LookupItem {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  employmentType: EmploymentType;
  departmentId?: string | null;
  department?: LookupItem | null;
  designationId?: string | null;
  designation?: LookupItem | null;
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
  dateOfJoining?: string;
  dateOfBirth?: string;
  status?: EmployeeStatus;
}
