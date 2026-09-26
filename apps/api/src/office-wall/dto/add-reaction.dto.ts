import { IsIn } from 'class-validator';
import { OFFICE_WALL_REACTION_TYPES } from './office-wall.constants';

export class AddReactionDto {
  @IsIn(OFFICE_WALL_REACTION_TYPES)
  reactionType!: string;
}
