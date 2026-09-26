import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as os from 'os';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOnlyGuard } from '../auth/admin-only.guard';
import { AdminService } from './admin.service';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

// The Admin Center's own governance surface -- everything here is
// Administrator-only (AdminOnlyGuard), stricter than the general
// StaffOnlyGuard the rest of the app's staff endpoints use. Route prefix
// is 'admin-center' rather than 'admin' to avoid colliding with the
// pre-existing /auth/admin/* admin-ACCOUNT endpoints (invite/list/role),
// which stayed on AuthController since they're about User rows, not this
// module's settings/audit/health concerns.
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
@Controller('admin-center')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateAdminSettingsDto) {
    return this.service.updateSettings(dto);
  }

  @Get('audit-logs')
  listAuditLogs(
    @Query('user') user?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listAuditLogs({ userQuery: user, module, action, from, to });
  }

  // Returns the CSV as a JSON string field rather than streaming a file
  // response -- the frontend turns it into a Blob and triggers the browser
  // download, which keeps this endpoint a plain JSON response like every
  // other one in the app.
  @Get('audit-logs/export')
  async exportAuditLogs(
    @Query('user') user?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.service.exportAuditLogsCsv({ userQuery: user, module, action, from, to });
    return { csv };
  }

  @Get('system-health')
  getSystemHealth() {
    return this.service.getSystemHealth();
  }

  // Real full-database file download -- see AdminService's Backup & Restore
  // comment for why this replaced the old partial JSON export.
  @Get('backup/download')
  async downloadBackup(@Res() res: Response) {
    const { path, fileName } = await this.service.getBackupFile();
    res.download(path, fileName);
  }

  // The upload lands in the OS temp dir first (same disk-based
  // FileInterceptor pattern as every other upload in this app, e.g.
  // CompanyDocumentsController) so AdminService can validate it -- magic
  // bytes and schema-migration compatibility -- before it ever touches the
  // real database file.
  @Post('backup/restore')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, os.tmpdir()),
        filename: (_req, _file, cb) => cb(null, `mitrahr-restore-${Date.now()}-${Math.round(Math.random() * 1e9)}.db`),
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  restoreBackup(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No backup file uploaded');
    return this.service.restoreBackupFile(req.user, file.path);
  }

  @Get('sessions')
  getLiveActivity() {
    return this.service.getLiveActivity();
  }

  @Post('sessions/:id/force-end')
  forceEndSession(@Req() req: any, @Param('id') id: string) {
    return this.service.forceEndSession(req.user, id);
  }
}
