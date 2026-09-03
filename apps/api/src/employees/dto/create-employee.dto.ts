import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const EMPLOYMENT_TYPES = ['INTERN', 'FULL_TIME', 'PART_TIME', 'CONTRACTOR'] as const;

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

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
