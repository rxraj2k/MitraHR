import { IsOptional, IsString } from 'class-validator';

export const APPROVAL_GROUPS = ['IT', 'FINANCE', 'HR_ADMIN'] as const;

export class ApproveCategoryDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
