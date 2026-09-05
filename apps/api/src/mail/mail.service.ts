import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
}

// Email delivery is provider-swappable via EMAIL_PROVIDER:
// - "console" (default): logs the message instead of sending it — used
//   while no real mailbox is configured yet.
// - "smtp": sends via any standard SMTP account, incl. Zoho Mail
//   (smtppro.zoho.com on a paid/domain plan, smtp.zoho.com on a free
//   personal one — check Zoho Mail Settings > Mail Accounts for the exact
//   host on your account/datacenter). Configure with SMTP_HOST, SMTP_PORT,
//   SMTP_SECURE ("true" for port 465, "false" for 587/STARTTLS), SMTP_USER,
//   SMTP_PASS (an app-specific password if the mailbox has 2FA on), and
//   MAIL_FROM (e.g. "MitraHR <notifications@offshoremitra.com>").
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly provider = process.env.EMAIL_PROVIDER || 'console';
  private transporter: nodemailer.Transporter | null = null;

  onModuleInit() {
    if (this.provider !== 'smtp') return;
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      this.logger.error(
        'EMAIL_PROVIDER=smtp but SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS are not fully set — falling back to console logging.',
      );
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    this.logger.log(`Email provider: smtp (${SMTP_HOST}:${SMTP_PORT})`);
  }

  async sendMail(input: SendMailInput): Promise<void> {
    if (this.provider === 'smtp' && this.transporter) {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
      return;
    }
    // console provider (or smtp misconfigured) — print instead of sending.
    this.logger.log(
      `\n----- [dev email] -----\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n------------------------`,
    );
  }
}
