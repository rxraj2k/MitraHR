import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

// Initiates a PerformanceReview record for one employee in one cycle —
// staff-only (see PerformanceReviewsController).
export class CreateReviewDto {
  @IsUUID()
  reviewCycleId!: string;

  @IsUUID()
  employeeId!: string;

  // How many peer reviewers this review expects — purely for the "2/3
  // Received" style badge in the 360 matrix. Defaults to 3 in the schema.
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedPeerReviewers?: number;
}
