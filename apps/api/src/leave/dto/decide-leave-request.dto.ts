import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideLeaveRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
