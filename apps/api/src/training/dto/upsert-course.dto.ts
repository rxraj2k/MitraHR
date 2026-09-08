import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

// Keep in sync with the frontend's TRAINING_CATEGORIES / CATEGORY_LABELS.
export const TRAINING_CATEGORIES = ['AGILE_TOOLS', 'MS365', 'ZOHO_TOOLS', 'SECURITY_IT', 'AI_TOOLS', 'GLOBAL_SKILLS'];

export class TrainingResourceInput {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @MinLength(1)
  url: string;
}

export class UpsertCourseDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsIn(TRAINING_CATEGORIES)
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  // e.g. "DevOps Engineer" — informational, shown as a tag when assigning.
  @IsOptional()
  @IsString()
  restrictedTo?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingResourceInput)
  resources?: TrainingResourceInput[];
}
