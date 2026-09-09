import { IsIn, IsOptional, IsString } from 'class-validator';

export const COMPANY_DOCUMENT_CATEGORIES = ['POLICY', 'TEMPLATE', 'HANDBOOK', 'OTHER'] as const;

export class UpdateCompanyDocumentDto {
  @IsOptional()
  @IsIn(COMPANY_DOCUMENT_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
