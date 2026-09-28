import { Injectable, Logger } from '@nestjs/common';

// Posts short activity notifications to Zoho Cliq via a Webhook Token --
// deliberately the simplest possible integration to start with (no OAuth,
// no real bot registration), same "start console, swap to real provider
// via env" shape as MailService. Two kinds of target, both using the same
// token, just a different URL shape (Zoho's "Messages" REST API):
// - postToChannel(): a shared company channel (e.g. announcements) -- not
//   gated by any per-employee email-preference flag, since it's a channel
//   everyone can just mute on their own end if they want to.
// - postDirectMessage(): a private 1:1 message to one specific employee,
//   by their email -- used so a leave decision reaches only that person,
//   not the whole company channel. Zoho's docs note this only works if the
//   recipient is an organization member (true for anyone with a Cliq seat
//   in the same org) -- if an employee has no Cliq account, this silently
//   no-ops (fire-and-forget, same as a bounced email would).
//
// Configure with:
// - CLIQ_PROVIDER: "webhook" to actually post; anything else (or unset)
//   logs instead, exactly like EMAIL_PROVIDER's "console" default.
// - CLIQ_API_BASE: the org-specific API root shown in a channel's
//   Connectors tab, everything before "/channelsbyname/..." -- looks like
//   https://cliq.zoho.in/company/<your-company-id>/api/v2
// - CLIQ_ZAPIKEY: the Webhook Token from Integrations > Webhook Tokens
//   (2FA-gated "Generate New Token"). The same token works for every
//   endpoint below -- it's a per-user key, not tied to one channel.
// - CLIQ_ANNOUNCEMENT_CHANNEL: the unique name (not display name) of the
//   channel postToChannel() without an explicit channel posts into, e.g.
//   "announcementsv".
@Injectable()
export class CliqService {
  private readonly logger = new Logger(CliqService.name);
  private readonly provider = process.env.CLIQ_PROVIDER || 'console';
  private readonly apiBase = process.env.CLIQ_API_BASE;
  private readonly zapikey = process.env.CLIQ_ZAPIKEY;
  private readonly announcementChannel = process.env.CLIQ_ANNOUNCEMENT_CHANNEL;

  async postToChannel(text: string, channel: string | undefined = this.announcementChannel): Promise<void> {
    if (!channel) {
      this.logger.warn('postToChannel called with no channel configured (CLIQ_ANNOUNCEMENT_CHANNEL unset) -- skipping.');
      return;
    }
    await this.post(`/channelsbyname/${encodeURIComponent(channel)}/message`, text, `channel:${channel}`);
  }

  async postDirectMessage(email: string, text: string): Promise<void> {
    await this.post(`/buddies/${encodeURIComponent(email)}/message`, text, `dm:${email}`);
  }

  private async post(path: string, text: string, label: string): Promise<void> {
    if (this.provider === 'webhook' && this.apiBase && this.zapikey) {
      const url = `${this.apiBase}${path}?zapikey=${this.zapikey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          this.logger.warn(`Cliq post to ${label} responded ${res.status}: ${await res.text().catch(() => '')}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to post to Cliq (${label}): ${(err as Error).message}`);
      }
      return;
    }
    // console provider (or webhook misconfigured) -- print instead of posting.
    this.logger.log(`\n----- [dev cliq -> ${label}] -----\n${text}\n----------------------`);
  }
}
