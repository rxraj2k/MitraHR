import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';
import { EXPERIENCE_LEVELS } from '../../recruitment/dto/recruitment.constants';

export const EMPLOYMENT_TYPES = ['INTERN', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR'] as const;

// Data-only for now — does not yet grant or restrict any login access.
// Access enforcement lands in the Roles & Permissions sprint.
export const SYSTEM_ROLES = ['ADMINISTRATOR', 'HR', 'MANAGER', 'EMPLOYEE', 'IT_SUPPORT'] as const;

// Talent Directory (Sprint 19). Billable/Shadow/Bench/Onboarding/Internal —
// see the schema.prisma comment on Employee.deploymentStatus for why this
// is staff-set rather than derived.
export const DEPLOYMENT_STATUSES = ['BILLABLE', 'SHADOW', 'BENCH', 'ONBOARDING', 'INTERNAL'] as const;

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

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

  // Talent Directory
  @IsOptional()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: string;

  @IsOptional()
  @IsIn(DEPLOYMENT_STATUSES)
  deploymentStatus?: string;

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
