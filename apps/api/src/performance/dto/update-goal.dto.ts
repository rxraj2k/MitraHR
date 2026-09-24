import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { GOAL_CATEGORIES, GOAL_STATUSES } from './performance.constants';

export class UpdateGoalDto {
  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @IsOptional()
  @IsUUID()
  parentGoalId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(GOAL_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
