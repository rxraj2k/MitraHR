import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const EMPLOYMENT_TYPES = ['INTERN', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR'] as const;

// Data-only for now — does not yet grant or restrict any login access.
// Access enforcement lands in the Roles & Permissions sprint.
export const SYSTEM_ROLES = ['ADMINISTRATOR', 'HR', 'MANAGER', 'EMPLOYEE', 'IT_SUPPORT'] as const;

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(EMPLOYMENT_TYPES)
  employmentType: string;

  // Placement & Hierarchy
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  designationId?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  workLocation?: string;

  @IsOptional()
  @IsUUID()
  reportingManagerId?: string;

  // Skills & Security
  @IsOptional()
  @IsIn(SYSTEM_ROLES)
  systemRole?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
