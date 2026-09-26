import { IsString, MinLength } from 'class-validator';

export class CreateOfficeWallCommentDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
