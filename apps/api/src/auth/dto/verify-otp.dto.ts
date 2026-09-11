import { IsEmail, IsString, Length } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';

export class VerifyOtpDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
