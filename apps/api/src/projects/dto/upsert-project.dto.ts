import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const CONTRACT_TYPES = ['T_AND_M', 'FIXED_PRICE', 'RETAINER', 'MANAGED_SERVICE'];
const CATEGORIES = ['DEVOPS', 'IAM', 'ACTIVE_DIRECTORY', 'CLOUD_SECURITY', 'CYBER_SECURITY'];

export class UpsertProjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES)
  contractType?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  technologyId?: string;

  // Junior employee, engaged with the client day to day.
  @IsOptional()
  @IsString()
  primaryMentorId?: string;

  // Senior employee, engaged when their expertise is needed.
  @IsOptional()
  @IsString()
  secondaryMentorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
