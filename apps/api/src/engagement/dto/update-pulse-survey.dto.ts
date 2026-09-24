import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PULSE_SURVEY_STATUSES } from './engagement.constants';

// Questions and audience aren't editable after creation on purpose — same
// "audience isn't editable here" precedent as UpdateAnnouncementDto, to
// avoid changing what a survey means after people may have already
// responded to it. Delete and recreate instead if the questions were wrong.
export class UpdatePulseSurveyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(PULSE_SURVEY_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  closesAt?: string | null;
}
