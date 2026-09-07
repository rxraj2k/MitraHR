import { IsDateString, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateCompOffDto {
  @IsDateString()
  workedDate: string;

  @IsString()
  @MinLength(1, { message: 'A reason is required' })
  reason: string;

  // Defaults to a full day (1). Use 0.5 for a half-day worked.
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1)
  daysEarned?: number;

  // Staff-only: log this on behalf of an employee. Ignored (the session's
  // own id is used instead) when an employee logs their own.
  @IsOptional()
  @IsString()
  employeeId?: string;
}
