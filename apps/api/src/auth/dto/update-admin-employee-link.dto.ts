import { IsOptional, IsString } from 'class-validator';

// Links (or unlinks, when omitted/empty) an EXISTING admin account to an
// Employee record after the fact — invite-time linking (InviteAdminDto)
// only covers brand-new admins; this covers ones already active (e.g. a
// seeded admin account that was never invited through the normal flow).
export class UpdateAdminEmployeeLinkDto {
  @IsOptional()
  @IsString()
  employeeId?: string;
}
