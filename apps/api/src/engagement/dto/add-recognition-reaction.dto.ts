import { IsIn } from 'class-validator';
import { RECOGNITION_REACTION_TYPES } from './engagement.constants';

export class AddRecognitionReactionDto {
  @IsIn(RECOGNITION_REACTION_TYPES)
  reactionType!: string;
}
