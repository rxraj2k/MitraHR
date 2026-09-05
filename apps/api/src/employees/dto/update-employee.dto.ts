import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EMPLOYMENT_TYPES, SYSTEM_ROLES } from './create-employee.dto';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) fullName?: string;
  @IsOptional() @IsEmail() email?: string;
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

  // Skills & Security
  @IsOptional() @IsIn(SYSTEM_ROLES) systemRole?: string;

  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(EMPLOYEE_STATUSES) status?: string;
}
