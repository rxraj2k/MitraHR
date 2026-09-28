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
//   not the whole company channel.
//   KNOWN GAP: Zoho's simple Webhook Token (zapikey) is only accepted for
//   channel/bot/extension endpoints -- confirmed by testing that the same
//   token gets a 401 on Cliq's /buddies/{email}/message endpoint, which
//   needs a real OAuth-authenticated request instead. Until a proper OAuth
//   connection is set up, this deliberately does NOT attempt the doomed
//   request -- it just logs an honest "not implemented yet" note so a
//   leave decision never crashes or spams a 401 warning, it just quietly
//   doesn't DM. Swap the early-return below for a real OAuth call once
//   that's set up.
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
    if (this.provider === 'webhook') {
      // See KNOWN GAP above -- a webhook token can't authenticate this
      // endpoint, so skip the guaranteed-401 network call entirely.
      this.logger.debug(`Cliq DM to ${email} skipped -- direct messages need OAuth, not yet set up.`);
      return;
    }
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
