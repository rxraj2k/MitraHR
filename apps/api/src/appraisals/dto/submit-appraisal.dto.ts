import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class CriterionScoreInput {
  @IsString()
  criterionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  selfRating: number;

  @IsOptional()
  @IsString()
  selfComment?: string;
}

// Employee's self-appraisal submission — one rating + comment per active
// criterion, plus the three non-weighted free-text sections and any
// skills/certifications picked up over the period (Master Data Skills).
export class SubmitAppraisalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionScoreInput)
  criteriaScores: CriterionScoreInput[];

  @IsOptional()
  @IsString()
  careerGoals?: string;

  @IsOptional()
  @IsString()
  managementSupport?: string;

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  skillIds?: string[];
}
