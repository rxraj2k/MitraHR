import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { PULSE_QUESTION_TYPES, PULSE_SURVEY_AUDIENCE_TYPES } from './engagement.constants';

export class PulseQuestionInputDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsIn(PULSE_QUESTION_TYPES)
  type!: string;
}

export class CreatePulseSurveyDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(PULSE_SURVEY_AUDIENCE_TYPES)
  audienceType?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  audienceDepartmentIds?: string[];

  @IsOptional()
  @IsDateString()
  closesAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PulseQuestionInputDto)
  questions!: PulseQuestionInputDto[];
}
