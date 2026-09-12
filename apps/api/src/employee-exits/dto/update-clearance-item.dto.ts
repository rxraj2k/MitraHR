import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateClearanceItemDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
