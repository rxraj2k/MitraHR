import { IsIn } from 'class-validator';

export const PRESENCE_STATUSES = ['AVAILABLE', 'AWAY'] as const;

export class UpdatePresenceDto {
  @IsIn(PRESENCE_STATUSES)
  status: (typeof PRESENCE_STATUSES)[number];
}
