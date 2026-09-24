import { IsString, MinLength } from 'class-validator';

export class CreateRecognitionCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
