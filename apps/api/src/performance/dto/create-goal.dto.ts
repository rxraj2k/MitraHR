import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { GOAL_CATEGORIES, GOAL_STATUSES } from './performance.constants';

export class CreateGoalDto {
  // Omitted for an EMPLOYEE-kind session (forced to their own id by the
  // controller); required when a staff account creates a goal on behalf
  // of someone else — same pattern as LeaveRequestsController.create.
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  reviewCycleId?: string;

  @IsOptional()
  @IsUUID()
  parentGoalId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

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
