import { IsIn } from 'class-validator';

export const TRAINING_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export class UpdateAssignmentStatusDto {
  @IsIn(TRAINING_STATUSES)
  status: string;
}
