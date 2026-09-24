import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CHECK_IN_CONFIDENCE_LEVELS } from './performance.constants';

export class CreateCheckInDto {
  // Same self-vs-on-behalf-of pattern as CreateGoalDto.
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  goalId?: string;

  @IsString()
  @MinLength(1)
  progressUpdate!: string;

  @IsOptional()
  @IsString()
  blockers?: string;

  @IsOptional()
  @IsIn(CHECK_IN_CONFIDENCE_LEVELS)
  confidence?: string;
}
