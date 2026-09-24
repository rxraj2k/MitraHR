import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateKeyResultDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
