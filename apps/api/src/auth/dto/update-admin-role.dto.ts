import { IsIn } from 'class-validator';
import { STAFF_ROLES } from './invite-admin.dto';

export class UpdateAdminRoleDto {
  @IsIn(STAFF_ROLES)
  role: string;
}
