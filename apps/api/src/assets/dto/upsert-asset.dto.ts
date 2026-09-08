import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

// Keep in sync with the frontend's ASSET_CATEGORIES / CATEGORY_LABELS.
export const ASSET_CATEGORIES = [
  'LAPTOP',
  'MONITOR',
  'MOBILE_PHONE',
  'ID_CARD',
  'SOFTWARE_LICENSE',
  'NETWORKING_EQUIPMENT',
  'OTHER',
];

// Core asset fields only — status is deliberately not editable here. It
// only ever changes via the assign/return/status actions, so it always
// agrees with whether an assignment is currently open.
export class UpsertAssetDto {
  @IsString()
  @MinLength(1)
  assetTag: string;

  @IsIn(ASSET_CATEGORIES)
  category: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
