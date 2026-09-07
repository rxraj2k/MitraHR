import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { StaffOnlyGuard } from './staff-only.guard';

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

  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @Get('admin/users')
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @Post('admin/invite')
  async inviteAdmin(@Body() dto: InviteAdminDto) {
    return this.authService.inviteAdmin(dto.name, dto.email, dto.employeeId);
  }

  @Post('admin/set-password')
  @HttpCode(200)
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return {
      id: req.user.sub,
      kind: req.user.kind,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      employeeId: req.user.kind === 'EMPLOYEE' ? req.user.sub : req.user.employeeId ?? null,
    };
  }
}
