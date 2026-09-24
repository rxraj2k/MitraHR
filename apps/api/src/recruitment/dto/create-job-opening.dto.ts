import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { EXPERIENCE_LEVELS, JOB_OPENING_EMPLOYMENT_TYPES, JOB_OPENING_STATUSES } from './recruitment.constants';

export class CreateJobOpeningDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  hiringManagerId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  technologyIds?: string[];

  @IsOptional()
  @IsIn(JOB_OPENING_EMPLOYMENT_TYPES)
  employmentType?: string;

  @IsOptional()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  salaryRange?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  headcountTarget?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(JOB_OPENING_STATUSES)
  status?: string;
}
