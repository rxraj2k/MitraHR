import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { EMPLOYMENT_TYPES } from './create-employee.dto';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(EMPLOYMENT_TYPES) employmentType?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(EMPLOYEE_STATUSES) status?: string;
}
