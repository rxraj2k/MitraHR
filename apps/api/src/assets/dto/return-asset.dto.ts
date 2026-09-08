import { IsIn, IsOptional, IsString } from 'class-validator';
import { ASSET_CONDITIONS } from './assign-asset.dto';

// What state the asset should end up in after coming back. Defaults to
// AVAILABLE (the normal case) — set to IN_REPAIR/RETIRED/LOST when the
// hand-back itself reveals the asset shouldn't go straight back into
// circulation.
export const ASSET_RESULTING_STATUSES = ['AVAILABLE', 'IN_REPAIR', 'RETIRED', 'LOST'];

export class ReturnAssetDto {
  @IsOptional()
  @IsIn(ASSET_CONDITIONS)
  conditionAtReturn?: string;

  @IsOptional()
  @IsString()
  returnNotes?: string;

  @IsOptional()
  @IsIn(ASSET_RESULTING_STATUSES)
  resultingStatus?: string;
}
