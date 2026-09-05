import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('employee/otp/request')
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestEmployeeOtp(dto.email);
  }

  @Post('employee/otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmployeeOtp(dto.email, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return { id: req.user.sub, kind: req.user.kind, email: req.user.email, name: req.user.name, role: req.user.role };
  }
}
