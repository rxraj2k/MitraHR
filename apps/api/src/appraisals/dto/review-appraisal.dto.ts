import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class CriterionReviewInput {
  @IsString()
  criterionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  managerRating: number;

  @IsOptional()
  @IsString()
  managerComment?: string;
}

// Admin/manager review — saved as a draft any number of times while the
// appraisal is UNDER_MANAGER_REVIEW; finalize (a separate endpoint) is
// what locks it and applies the compensation decision.
export class ReviewAppraisalDto {
  @Type(() => CriterionReviewInput)
  @ValidateNested({ each: true })
  criteriaReviews: CriterionReviewInput[];

  @IsOptional()
  @IsNumber()
  currentCTC?: number;

  @IsOptional()
  @IsNumber()
  incrementPercent?: number;

  @IsOptional()
  @IsNumber()
  incrementAmount?: number;

  @IsOptional()
  @IsISO8601()
  effectiveDate?: string;
}

export class FinalizeAppraisalDto extends ReviewAppraisalDto {}
