import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class InviteAdminDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  // Optional: link this admin to their own Employee record so they can
  // submit their own leave requests etc. while logged in as staff.
  @IsOptional()
  @IsString()
  employeeId?: string;
}
