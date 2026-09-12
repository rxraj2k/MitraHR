import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export const CLIENT_CONTRACT_STATUSES = ['ACTIVE', 'RENEWED', 'TERMINATED'] as const;

export class UpdateClientContractDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsIn(CLIENT_CONTRACT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
