import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

export class QuizOptionInput {
  @IsString()
  @MinLength(1)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class QuizQuestionInput {
  @IsString()
  @MinLength(1)
  text: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionInput)
  options: QuizOptionInput[];
}

// Questions/options are always saved wholesale (see QuizzesService.upsertForCourse) —
// same pattern as TrainingCourse.resources — so this DTO always carries the
// full question list, never a partial patch.
export class UpsertQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionInput)
  questions: QuizQuestionInput[];
}
