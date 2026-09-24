import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Every field optional -- a PATCH can change just the dates, just the day
// part, or the whole thing. Only ever accepted while the request is still
// PENDING (see LeaveRequestsService.update): once decided, the path to
// change a leave is cancel + re-apply, not silently editing something
// staff already approved or rejected.
export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['FULL', 'FIRST_HALF', 'SECOND_HALF'])
  dayPart?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'A reason is required' })
  reason?: string;
}
