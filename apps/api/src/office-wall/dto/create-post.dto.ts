import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { OFFICE_WALL_CATEGORIES } from './office-wall.constants';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsIn(OFFICE_WALL_CATEGORIES)
  category!: string;

  // The "Tag Colleague" quick action on a Shoutout/Kudos post -- who the
  // post is about, separate from free-text @mentions below.
  @IsOptional()
  @IsUUID()
  taggedEmployeeId?: string;

  // Resolved by the composer's @mention picker at type time -- always
  // real employee ids, never re-parsed from the body text server-side.
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  mentionedEmployeeIds?: string[];
}
