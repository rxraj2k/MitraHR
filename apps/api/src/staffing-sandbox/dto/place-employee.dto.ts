import { IsOptional, IsString } from 'class-validator';

export class PlaceEmployeeDto {
  @IsString()
  employeeId!: string;

  // Omitted or null both mean "back to Bench".
  @IsOptional()
  @IsString()
  projectId?: string | null;
}
