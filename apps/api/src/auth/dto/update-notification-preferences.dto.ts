import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailOnLeaveDecision?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnAnnouncement?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnAssessmentResult?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnBirthday?: boolean;

  @IsOptional()
  @IsBoolean()
  emailOnAppraisal?: boolean;
}
