import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { requestIp } from '../audit/audit.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { UpdateAdminEmployeeLinkDto } from './dto/update-admin-employee-link.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { StaffOnlyGuard } from './staff-only.guard';
import { AdminOnlyGuard } from './admin-only.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Req() req: any, @Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, requestIp(req), req.headers['user-agent'] || null);
  }

  @Post('employee/otp/request')
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestEmployeeOtp(dto.email);
  }

  @Post('employee/otp/verify')
  @HttpCode(200)
  async verifyOtp(@Req() req: any, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmployeeOtp(dto.email, dto.code, requestIp(req), req.headers['user-agent'] || null);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Get('admin/users')
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Post('admin/invite')
  async inviteAdmin(@Req() req: any, @Body() dto: InviteAdminDto) {
    return this.authService.inviteAdmin(req.user, dto.name, dto.email, dto.employeeId, dto.role);
  }

  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @Patch('admin/:id/employee-link')
  async updateAdminEmployeeLink(@Param('id') id: string, @Body() dto: UpdateAdminEmployeeLinkDto) {
    return this.authService.updateAdminEmployeeLink(id, dto.employeeId || null);
  }

  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @Patch('admin/:id/role')
  async updateAdminRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAdminRoleDto) {
    return this.authService.updateAdminRole(req.user, id, dto.role);
  }

  @Post('admin/set-password')
  @HttpCode(200)
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.getMe(req.user);
  }

  // Real sign-out: closes this session's UserSession row (see
  // schema.prisma) so it stops showing as Active/Away in the Admin
  // Center's Live User Activity panel and shows as "Logged out" instead.
  // Best-effort on the service side, so it never blocks the frontend from
  // clearing its local token even if this call fails.
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: any) {
    if (req.user?.sid) await this.authService.endSession(req.user.sid);
    return { ok: true };
  }

  // Called every ~60s by the frontend while a tab is open (see
  // AuthContext.tsx) to keep this session's lastSeenAt fresh -- this is
  // what actually distinguishes "Active" from "Away" in Live User Activity.
  @UseGuards(JwtAuthGuard)
  @Patch('session/heartbeat')
  async heartbeat(@Req() req: any) {
    if (req.user?.sid) await this.authService.heartbeat(req.user.sid);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/presence')
  async updatePresence(@Req() req: any, @Body() dto: UpdatePresenceDto) {
    return this.authService.setPresence(req.user, dto.status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notification-preferences')
  async updateNotificationPreferences(@Req() req: any, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.authService.updateNotificationPreferences(req.user, dto);
  }

  // STAFF-only -- an EMPLOYEE (OTP) session has no password to change.
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    if (req.user.kind !== 'STAFF') {
      throw new ForbiddenException('This account signs in via OTP and has no password to change');
    }
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
