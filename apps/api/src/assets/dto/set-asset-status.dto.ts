import { IsIn } from 'class-validator';

// Admin correction for an asset that currently has no open assignment
// (e.g. marking a spare laptop Retired or Lost, or bringing one back from
// repair). ASSIGNED is deliberately excluded — that only ever happens via
// the dedicated Assign action, which also records who has it.
export const ASSET_DIRECT_STATUSES = ['AVAILABLE', 'IN_REPAIR', 'RETIRED', 'LOST'];

export class SetAssetStatusDto {
  @IsIn(ASSET_DIRECT_STATUSES)
  status: string;
}
