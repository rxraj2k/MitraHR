import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { REVIEW_RATER_TYPES } from './performance.constants';

export class SubmitFeedbackDto {
  // Omitted for an EMPLOYEE-kind session (forced to their own id);
  // required when staff submit on someone's behalf (e.g. logging a peer's
  // verbal feedback for them).
  @IsOptional()
  @IsUUID()
  raterId?: string;

  @IsIn(REVIEW_RATER_TYPES)
  raterType!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  technicalRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  teamworkRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  goalAchievementRating?: number;

  @IsOptional()
  @IsString()
  comments?: string;
}
