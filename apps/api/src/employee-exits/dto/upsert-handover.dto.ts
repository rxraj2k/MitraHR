import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertHandoverDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  primarySuccessorId?: string;

  @IsOptional()
  @IsString()
  secondarySuccessorId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
