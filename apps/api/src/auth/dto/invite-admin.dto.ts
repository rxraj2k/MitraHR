import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';

// Roles & Permissions (minimal, Sprint 19 follow-up): every staff account
// was 'ADMIN' until now — there was no way to invite anyone with a
// narrower role. Kept as 'ADMIN' rather than renamed to 'ADMINISTRATOR' so
// every existing account (this DB's real admins) keeps working without a
// data migration; this is a separate, smaller vocabulary from
// Employee.systemRole (SYSTEM_ROLES in employees/dto/create-employee.dto.ts),
// which is data-only and still doesn't gate anything.
export const STAFF_ROLES = ['ADMIN', 'HR', 'MANAGER', 'IT_SUPPORT'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export class InviteAdminDto {
  @IsString()
  @MinLength(1)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  // Optional: link this admin to their own Employee record so they can
  // submit their own leave requests etc. while logged in as staff.
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: string;
}
