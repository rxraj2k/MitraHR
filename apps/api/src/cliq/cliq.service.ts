import { Injectable, Logger } from '@nestjs/common';

// Posts short activity notifications (leave decisions, new announcements,
// etc.) into a single Zoho Cliq channel via an Incoming Webhook -- this is
// deliberately the simplest possible integration to start with (no OAuth,
// no bot, no per-employee DM mapping), same "start console, swap to real
// provider via env" shape as MailService. It is a company-wide activity
// feed, not a personal notification channel, so it is NOT gated by any
// per-employee email-preference flag (emailOnLeaveDecision etc.) -- those
// control the employee's own inbox, this controls one shared Cliq channel
// everyone who cares can just mute on their end if they want to.
//
// Configure with:
// - CLIQ_PROVIDER: "webhook" to actually post; anything else (or unset)
//   logs instead, exactly like EMAIL_PROVIDER's "console" default.
// - CLIQ_WEBHOOK_URL: assembled by hand from a Webhook Token -- in Cliq,
//   go to Integrations > Webhook Tokens (left sidebar, under "My
//   Extensions"), click "Generate New Token" (2FA-gated) and copy it. Then
//   open the target channel > its settings (gear icon) and copy its
//   "Unique Name" (not its display name). Build the full URL as:
//   https://cliq.zoho.in/api/v2/channelsbyname/<channel-unique-name>/message?zapikey=<token>
//   (use cliq.zoho.com instead of .in if the org isn't on the India DC).
@Injectable()
export class CliqService {
  private readonly logger = new Logger(CliqService.name);
  private readonly provider = process.env.CLIQ_PROVIDER || 'console';
  private readonly webhookUrl = process.env.CLIQ_WEBHOOK_URL;

  async postMessage(text: string): Promise<void> {
    if (this.provider === 'webhook' && this.webhookUrl) {
      try {
        const res = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          this.logger.warn(`Cliq webhook responded ${res.status}: ${await res.text().catch(() => '')}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to post to Cliq webhook: ${(err as Error).message}`);
      }
      return;
    }
    // console provider (or webhook misconfigured) -- print instead of posting.
    this.logger.log(`\n----- [dev cliq] -----\n${text}\n----------------------`);
  }
}
