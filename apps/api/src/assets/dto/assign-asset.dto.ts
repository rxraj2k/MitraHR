import { IsIn, IsOptional, IsString } from 'class-validator';

export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export class AssignAssetDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsIn(ASSET_CONDITIONS)
  conditionAtAssignment?: string;
}
