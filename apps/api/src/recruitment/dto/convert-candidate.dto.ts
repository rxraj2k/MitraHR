import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { EMPLOYMENT_TYPES } from '../../employees/dto/create-employee.dto';

// "Offer & Convert to Employee" — a lightweight bridge into the real
// Employees module rather than a duplicate onboarding form. The drawer
// pre-fills these from the candidate + job opening; the recruiter can
// still edit before submitting. Only fullName/email/employmentType are
// actually required by CreateEmployeeDto, so this stays a small form.
export class ConvertCandidateDto {
  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsIn(EMPLOYMENT_TYPES)
  employmentType!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  dateOfJoining?: string;
}
