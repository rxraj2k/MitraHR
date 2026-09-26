import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// All optional -- the Admin Center's Security/Automations/Backup tabs each
// PATCH just the fields their own form touched.
export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsBoolean()
  enforceMfaForAdmins?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  passwordExpiryDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  sessionIdleTimeoutMin?: number;

  @IsOptional()
  @IsString()
  ipWhitelist?: string;

  @IsOptional()
  @IsBoolean()
  appraisalEmailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  assetAssignmentNoticeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  documentExpiryAlertEnabled?: boolean;

  @IsOptional()
  @IsString()
  appraisalEmailSubjectTemplate?: string;

  @IsOptional()
  @IsString()
  appraisalEmailBodyTemplate?: string;

  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY'])
  backupSchedule?: string;
}
