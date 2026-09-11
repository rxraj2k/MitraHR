import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// Audience (who an announcement targets) is set once at creation and not
// editable here — changing it would silently change who has already
// seen/liked/commented on it. To retarget, post a new announcement.
export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  commentsDisabled?: boolean;

  // ISO date string, or null to clear an expiry.
  @IsOptional()
  expiresAt?: string | null;
}
