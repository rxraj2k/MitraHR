import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// The Exit Interview & Feedback drawer tab. Kept as its own endpoint/DTO
// rather than folded into UpdateExitDto so HR can save interview notes
// independently of the header fields.
export class UpdateExitFeedbackDto {
  @IsOptional()
  @IsDateString()
  interviewCompletedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cultureScore?: number;

  @IsOptional()
  @IsString()
  managementFeedback?: string;

  @IsOptional()
  @IsBoolean()
  rehireEligible?: boolean;
}
