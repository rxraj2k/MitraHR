import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class InitiateExitDto {
  @IsString()
  employeeId: string;

  // When the employee actually gave notice — distinct from lastWorkingDay
  // (end of notice period) and from the record's own initiatedAt (when HR
  // got around to creating this record, which can lag a day or two).
  @IsDateString()
  resignationDate: string;

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

  @IsOptional()
  @IsDateString()
  accessRevocationAt?: string;
}
