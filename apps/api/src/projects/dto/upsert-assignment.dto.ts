import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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
