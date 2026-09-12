import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class InitiateExitDto {
  @IsString()
  employeeId: string;

  // The employee's last working day (end of notice period) — separate
  // from "today", since exits are almost always initiated ahead of time.
  @IsDateString()
  lastWorkingDay: string;

  @IsString()
  @MinLength(1, { message: 'A reason is required' })
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
