import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

// Edits to the exit's own header fields — deliberately separate from
// UpdateClearanceItemDto (per-checklist-item) and UpdateExitFeedbackDto
// (the exit-interview tab), so each drawer tab saves only what it owns.
export class UpdateExitDto {
  @IsOptional()
  @IsDateString()
  resignationDate?: string;

  @IsOptional()
  @IsDateString()
  lastWorkingDay?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'A reason is required' })
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  accessRevocationAt?: string;
}
