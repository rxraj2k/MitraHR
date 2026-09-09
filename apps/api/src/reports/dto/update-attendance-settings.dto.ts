import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateAttendanceSettingsDto {
  // 24h "HH:MM", validated with a simple regex rather than a full time
  // library — this is a single admin-configured value, not user input at scale.
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'expectedStartTime must be in HH:MM (24h) format' })
  expectedStartTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  graceMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(12)
  halfDayThresholdHours?: number;
}
