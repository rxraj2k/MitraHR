import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

// Closing a project out: when it actually ended, and a short summary of
// what it was about and how it went — kept around for the reporting
// feature later, not just for display here.
export class EndProjectDto {
  // Defaults to today when omitted.
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  @MinLength(1, { message: 'A closing summary is required' })
  closureSummary: string;
}
