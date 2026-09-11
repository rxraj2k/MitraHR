import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';

export class RequestOtpDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
