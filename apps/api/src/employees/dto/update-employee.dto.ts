import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';
import { DEPLOYMENT_STATUSES, EMPLOYMENT_TYPES, SYSTEM_ROLES } from './create-employee.dto';
import { EXPERIENCE_LEVELS } from '../../recruitment/dto/recruitment.constants';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) fullName?: string;
  @IsOptional() @NormalizeEmail() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: string;

  // Placement & Hierarchy
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsString() team?: string;
  @IsOptional() @IsString() workLocation?: string;
  @IsOptional() @IsUUID() reportingManagerId?: string;

  // Talent Directory
  @IsOptional() @IsIn(EXPERIENCE_LEVELS) experienceLevel?: string;
  @IsOptional() @IsIn(DEPLOYMENT_STATUSES) deploymentStatus?: string;

  // Skills & Security
  @IsOptional() @IsIn(SYSTEM_ROLES) systemRole?: string;

  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(EMPLOYEE_STATUSES) status?: string;
}
