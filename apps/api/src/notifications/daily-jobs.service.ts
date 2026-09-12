import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from './notifications.service';

// Document-expiry warnings fire at three fixed lead times rather than every
// day the document is within some window — each threshold is hit exactly
// once as the days-remaining count ticks down, so this needs no separate
// "did we already notify for this one" bookkeeping.
const EXPIRY_WARNING_DAYS = [7, 3, 1, 0];

function startOfUtcDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function daysBetweenUtc(from: Date, to: Date): number {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / 86400000);
}

@Injectable()
export class DailyJobsService {
  private readonly logger = new Logger(DailyJobsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  // Once a day, at 8am server time. NestJS's ScheduleModule keeps this
  // registered for as long as the API process stays running — there's no
  // separate scheduler to deploy.
  @Cron('0 8 * * *')
  async runDailyChecks() {
    await this.sendBirthdayGreetings().catch((err) => this.logger.error('Birthday check failed', err));
    await this.flagExpiringDocuments().catch((err) => this.logger.error('Document expiry check failed', err));
    await this.flagExpiringContracts().catch((err) => this.logger.error('Contract renewal check failed', err));
  }

  private async sendBirthdayGreetings() {
    const today = new Date();
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', dateOfBirth: { not: null } },
      select: { id: true, fullName: true, email: true, dateOfBirth: true },
    });
    const birthdayPeople = employees.filter((e) => {
      const dob = e.dateOfBirth as unknown as Date;
      return dob.getUTCMonth() === today.getUTCMonth() && dob.getUTCDate() === today.getUTCDate();
    });
    for (const employee of birthdayPeople) {
      const firstName = employee.fullName.split(' ')[0];
      await this.mail.sendMail({
        to: employee.email,
        subject: `Happy Birthday, ${firstName}! 🎂`,
        text: `Hi ${firstName},\n\nWishing you a very happy birthday from everyone at Offshore Mitra. Have a wonderful day!\n\n— MitraHR`,
      });
      await this.notifications.notifyEmployee(employee.id, {
        type: 'BIRTHDAY',
        title: `🎂 Happy Birthday, ${firstName}!`,
        body: 'Wishing you a wonderful day from the whole team.',
        employeeLink: '/',
        staffLink: '/',
      });
    }
    if (birthdayPeople.length > 0) {
      this.logger.log(`Sent ${birthdayPeople.length} birthday email(s).`);
    }
  }

  private async flagExpiringDocuments() {
    const today = new Date();
    const documents = await this.prisma.employeeDocument.findMany({
      where: { expiryDate: { not: null } },
      include: { employee: { select: { id: true, fullName: true } } },
    });
    let flagged = 0;
    for (const doc of documents) {
      const daysUntil = daysBetweenUtc(today, doc.expiryDate as unknown as Date);
      if (!EXPIRY_WARNING_DAYS.includes(daysUntil)) continue;
      const when = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      const title = daysUntil <= 0 ? `${doc.documentType.replace(/_/g, ' ')} has expired` : `${doc.documentType.replace(/_/g, ' ')} expires ${when}`;
      await this.notifications.notifyEmployee(doc.employeeId, {
        type: 'DOCUMENT_EXPIRING',
        title,
        body: doc.fileName,
        employeeLink: '/',
        staffLink: '/documents',
      });
      await this.notifications.notifyAllStaff({
        type: 'DOCUMENT_EXPIRING',
        title: `${doc.employee.fullName}: ${title.toLowerCase()}`,
        body: doc.fileName,
        link: '/documents',
      });
      flagged += 1;
    }
    if (flagged > 0) {
      this.logger.log(`Flagged ${flagged} expiring document(s).`);
    }
  }

  // Same fixed-lead-time pattern as flagExpiringDocuments, but for client
  // contracts — staff-only concern (clients aren't shown to employees), so
  // this only ever notifies staff, never notifyEmployee.
  private async flagExpiringContracts() {
    const today = new Date();
    const contracts = await this.prisma.clientContract.findMany({
      where: { endDate: { not: null }, status: { in: ['ACTIVE', 'RENEWED'] } },
      include: { client: { select: { name: true } } },
    });
    let flagged = 0;
    for (const contract of contracts) {
      const daysUntil = daysBetweenUtc(today, contract.endDate as unknown as Date);
      if (!EXPIRY_WARNING_DAYS.includes(daysUntil)) continue;
      const when = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      const title =
        daysUntil <= 0
          ? `Contract with ${contract.client.name} has expired`
          : `Contract with ${contract.client.name} expires ${when}`;
      await this.notifications.notifyAllStaff({
        type: 'CONTRACT_EXPIRING',
        title,
        body: contract.title,
        link: '/clients',
      });
      flagged += 1;
    }
    if (flagged > 0) {
      this.logger.log(`Flagged ${flagged} expiring contract(s).`);
    }
  }
}
