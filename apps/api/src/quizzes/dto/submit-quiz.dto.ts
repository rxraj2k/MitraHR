import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class QuizAnswerInput {
  @IsString()
  questionId: string;

  // Omitted/undefined = the employee left this question blank — still
  // counts toward "attempted" but is graded incorrect, never dropped from
  // totalQuestions.
  @IsOptional()
  @IsString()
  selectedOptionId?: string;
}

export class SubmitQuizDto {
  // Staff-on-behalf-of convention, same as AssignTrainingDto/training "my":
  // an EMPLOYEE-kind session always submits as itself regardless of this
  // field; a STAFF session may pass it to submit for a specific employee.
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerInput)
  answers: QuizAnswerInput[];
}
