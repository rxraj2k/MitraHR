import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

// Keep in sync with the frontend's TRAINING_CATEGORIES / CATEGORY_LABELS
// (apps/web/src/lib/trainingCategories.ts) — this previously only listed
// the original 6 Mandatory categories, silently rejecting any attempt to
// create/edit an IAM or DevOps course through the admin UI (the seed
// scripts bypassed this DTO by writing to Prisma directly, which is why
// IAM/DevOps courses already exist despite the mismatch).
export const TRAINING_CATEGORIES = [
  'AGILE_TOOLS',
  'MS365',
  'ZOHO_TOOLS',
  'SECURITY_IT',
  'AI_TOOLS',
  'GLOBAL_SKILLS',
  'IAM_UDEMY',
  'IAM_CLOUDFOUNDATION',
  'IAM_SECAPPS',
  'DEVOPS_UDEMY',
];

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
