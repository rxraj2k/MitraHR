export type EmploymentType = 'INTERN' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  employmentType: EmploymentType;
  department?: string | null;
  designation?: string | null;
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
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  status?: EmployeeStatus;
}
