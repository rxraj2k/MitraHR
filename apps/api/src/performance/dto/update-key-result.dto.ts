import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateKeyResultDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
