import { Injectable, Logger } from '@nestjs/common';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
}

// Email delivery is provider-swappable via EMAIL_PROVIDER.
// - "console" (default): logs the message instead of sending it — lets us
//   build and test OTP login, invite links, etc. before real email is wired up.
// - "smtp": intended for Zoho Mail (smtp.zoho.com) once real sending is wanted.
//   Not implemented yet — wiring it in is a small, contained change here only,
//   nothing else in the app needs to know which provider is active.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider = process.env.EMAIL_PROVIDER || 'console';

  async sendMail(input: SendMailInput): Promise<void> {
    if (this.provider === 'smtp') {
      throw new Error(
        'EMAIL_PROVIDER=smtp is not wired up yet. Set EMAIL_PROVIDER=console (or unset it) until Zoho SMTP is configured.',
      );
    }
    // console provider — print the email instead of sending it.
    this.logger.log(
      `\n----- [dev email] -----\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n------------------------`,
    );
  }
}
