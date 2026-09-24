import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  roleOnProject?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  allocationPercent?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  // Leadership tag — set from the "Add Mentors" form to designate this
  // team member as the project's Primary or Secondary mentor (also syncs
  // Project.primaryMentorId/secondaryMentorId). Omitted for a plain team
  // member.
  @IsOptional()
  @IsIn(['PRIMARY', 'SECONDARY'])
  mentorRole?: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  roleOnProject?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  allocationPercent?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;
}
