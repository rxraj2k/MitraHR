import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  // Staff-only: mark/correct attendance for this employee instead of self.
  @IsOptional()
  @IsString()
  employeeId?: string;

  // Staff-only: defaults to today. Lets an admin correct a missed check-in.
  @IsOptional()
  @IsDateString()
  date?: string;
}
