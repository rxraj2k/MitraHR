import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CLIENT_DOMAINS, CLIENT_REGIONS, US_TIMEZONES } from './client.constants';
import { IsCommaSeparatedIn } from './is-comma-separated-in';

const STATUSES = ['ACTIVE', 'INACTIVE'];

export class UpsertClientDto {
  @IsString()
  @MinLength(1)
  name: string;

  // Comma-joined technical domain codes (see CLIENT_DOMAINS) — multi-select
  // in the frontend, one column here.
  @IsOptional()
  @IsCommaSeparatedIn(CLIENT_DOMAINS)
  industry?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsIn(US_TIMEZONES)
  timezone?: string;

  @IsOptional()
  @IsIn(CLIENT_REGIONS)
  region?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
