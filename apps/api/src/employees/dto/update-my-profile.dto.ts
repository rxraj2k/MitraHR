import { IsOptional, IsString } from 'class-validator';

// The whitelist of fields an OTP-logged-in employee can edit on their own
// record. Deliberately narrow for now (just phone) — expand this once the
// full list of self-service fields is decided.
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;
}
