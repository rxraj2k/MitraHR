import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['FULL', 'FIRST_HALF', 'SECOND_HALF'])
  dayPart?: string;

  @IsString()
  @MinLength(1, { message: 'A reason is required' })
  reason: string;

  // Staff-only: submit a request on behalf of this employee. Ignored (the
  // session's own id is used instead) when an employee submits their own.
  @IsOptional()
  @IsString()
  employeeId?: string;
}
