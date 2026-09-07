import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideCompOffDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
