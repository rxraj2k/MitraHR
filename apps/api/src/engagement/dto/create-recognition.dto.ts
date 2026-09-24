import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { RECOGNITION_CATEGORIES, RECOGNITION_POINT_OPTIONS } from './engagement.constants';

export class CreateRecognitionDto {
  @IsUUID()
  toEmployeeId!: string;

  @IsIn(RECOGNITION_CATEGORIES)
  category!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsIn(RECOGNITION_POINT_OPTIONS)
  points?: number;
}
