import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class PulseAnswerInputDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingValue?: number;

  @IsOptional()
  @IsBoolean()
  boolValue?: boolean;

  @IsOptional()
  @IsString()
  textValue?: string;
}

export class SubmitPulseSurveyResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PulseAnswerInputDto)
  answers!: PulseAnswerInputDto[];
}
