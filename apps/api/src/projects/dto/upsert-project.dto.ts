import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const CONTRACT_TYPES = ['T_AND_M', 'FIXED_PRICE', 'RETAINER', 'MANAGED_SERVICE'];

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
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  projectManagerId?: string;
}
