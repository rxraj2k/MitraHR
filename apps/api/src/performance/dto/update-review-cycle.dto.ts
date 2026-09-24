import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { REVIEW_CYCLE_STATUSES } from './performance.constants';

export class UpdateReviewCycleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(REVIEW_CYCLE_STATUSES)
  status?: string;
}
