import { IsEmail, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transformers';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
