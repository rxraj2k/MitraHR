import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { APPRAISAL_AUTO_EMAIL_WINDOW_DAYS, APPRAISAL_CYCLE_DAYS, APPRAISAL_EMAIL_LEAD_DAYS } from './dto/appraisal.constants';
import { SubmitAppraisalDto } from './dto/submit-appraisal.dto';
import { FinalizeAppraisalDto, ReviewAppraisalDto } from './dto/review-appraisal.dto';
import { AuditActor, auditEntry } from '../audit/audit.util';

const EMPLOYEE_CARD_SELECT = {
  id: true,
  fullName: true,
  email: true,
  photoUrl: true,
  employeeCode: true,
  currentCTC: true,
  dateOfJoining: true,
  department: { select: { name: true } },
  designation: { select: { name: true } },
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfUtcDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function cycleLabel(cycleNumber: number): string {
  return `${cycleNumber * (APPRAISAL_CYCLE_DAYS / 30)}-Month Review`;
}

// Straight sum of (rating * weight/100) over whatever criteria have a
// rating so far -- matches the spec's formula exactly when every active
// criterion is rated and weights sum to 100; a partial save just reads as
// a lower in-progress number rather than being renormalized to look
// falsely complete.
function weightedScore(entries: Array<{ rating: number | null | undefined; weight: number }>): number | null {
  const rated = entries.filter((e) => e.rating != null);
  if (!rated.length) return null;
  const sum = rated.reduce((acc, e) => acc + (e.rating as number) * (e.weight / 100), 0);
  return Math.round(sum * 100) / 100;
}

@Injectable()
export class AppraisalsService {
  private readonly logger = new Logger(AppraisalsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  // Runs daily alongside DailyJobsService's own 8am checks (a separate
  // @Cron rather than wiring into that service, since ScheduleModule.forRoot()
  // at the app root already makes @Cron work on any injectable — no need to
  // route this cross-module). For every active employee, only ever looks at
  // their NEXT unresolved cycle (existing appraisal count + 1): this means an
  // employee who joined long before this feature shipped gets exactly one
  // (possibly overdue-looking) cycle surfaced now rather than a backlog of
  // every 180-day mark they've ever crossed.
  @Cron('0 8 * * *')
  async runDailyCycleCheck() {
    await this.checkAppraisalCycles().catch((err) => this.logger.error('Appraisal cycle check failed', err));
  }

  // Public (not just cron-private) so a staff-only "Run appraisal check
  // now" action can fire it on demand -- same rationale as
  // NotificationsController's run-daily-check: useful for testing (a
  // dateOfJoining edited to fall inside the trigger window won't surface
  // until this or the 8am cron runs) and for catching up after downtime.
  async checkAppraisalCycles(): Promise<{ triggered: number; emailed: number; backlogged: number }> {
    const today = startOfUtcDay(new Date());
    // Admin Center > Automations toggle -- when off, cycles still get
    // created (so they're visible in-app) but nothing is auto-emailed,
    // same as the existing backlog cap just below. Missing settings row
    // defaults to on, matching the field's own DB default.
    const settings = await this.prisma.adminSettings.findUnique({ where: { id: 'default' } });
    const appraisalEmailsEnabled = settings?.appraisalEmailEnabled !== false;
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', dateOfJoining: { not: null } },
      select: { id: true, fullName: true, email: true, dateOfJoining: true, emailOnAppraisal: true, _count: { select: { appraisals: true } } },
    });

    let triggered = 0;
    let emailed = 0;
    let backlogged = 0;
    for (const employee of employees) {
      const nextCycle = employee._count.appraisals + 1;
      const joining = startOfUtcDay(employee.dateOfJoining as unknown as Date);
      const dueDate = addDays(joining, APPRAISAL_CYCLE_DAYS * nextCycle);
      const triggerDate = addDays(dueDate, -APPRAISAL_EMAIL_LEAD_DAYS);
      if (today.getTime() < triggerDate.getTime()) continue;

      // Existence is guarded by the @@unique([employeeId, cycleNumber])
      // constraint too, but checking first avoids a noisy failed-insert on
      // every one of the (up to 6) daily re-runs before submission.
      const existing = await this.prisma.appraisal.findUnique({
        where: { employeeId_cycleNumber: { employeeId: employee.id, cycleNumber: nextCycle } },
      });
      if (existing) continue;

      // How stale is this cycle's trigger window? A brand-new hire crossing
      // their 173-day mark today is exactly what this feature is for and
      // should email right away. Someone who joined years ago and is only
      // now getting their very first (cycle 1) row created -- because this
      // feature didn't exist until now -- is backlog, not a live trigger,
      // and should NOT silently fan out a real email. See
      // APPRAISAL_AUTO_EMAIL_WINDOW_DAYS for the incident this guards against.
      const daysPastTrigger = Math.round((today.getTime() - triggerDate.getTime()) / (1000 * 60 * 60 * 24));
      const withinAutoEmailWindow = daysPastTrigger <= APPRAISAL_AUTO_EMAIL_WINDOW_DAYS && appraisalEmailsEnabled;

      await this.prisma.appraisal.create({
        data: { employeeId: employee.id, cycleNumber: nextCycle, dueDate, emailSentAt: withinAutoEmailWindow ? new Date() : null },
      });

      if (withinAutoEmailWindow) {
        if (employee.emailOnAppraisal) {
          await this.sendTriggerEmail(employee, nextCycle, dueDate);
        }
        await this.notifications.notifyEmployee(employee.id, {
          type: 'APPRAISAL_DUE',
          title: `${cycleLabel(nextCycle)} self-appraisal is ready`,
          body: `Complete it by ${dueDate.toDateString()}.`,
          employeeLink: '/my-performance',
          staffLink: '/my-performance',
        });
        emailed += 1;
      } else {
        backlogged += 1;
      }
      triggered += 1;
    }
    if (triggered > 0) {
      this.logger.log(
        `Triggered ${triggered} appraisal cycle(s) -- ${emailed} emailed, ${backlogged} added to the backlog without emailing.`,
      );
    }
    return { triggered, emailed, backlogged };
  }

  // Lets an admin consciously send the trigger email for a cycle that was
  // added to the backlog (see checkAppraisalCycles/APPRAISAL_AUTO_EMAIL_WINDOW_DAYS)
  // instead of it firing automatically. Also usable to resend a lost email
  // for any still-pending cycle.
  async sendReminder(id: string) {
    const appraisal = await this.prisma.appraisal.findUnique({
      where: { id },
      include: { employee: { select: { id: true, fullName: true, email: true, emailOnAppraisal: true } } },
    });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    if (appraisal.status !== 'PENDING_EMPLOYEE') {
      throw new BadRequestException('This appraisal is past the pending-employee stage');
    }
    if (!appraisal.employee.emailOnAppraisal) {
      throw new BadRequestException('This employee has opted out of appraisal emails');
    }
    await this.sendTriggerEmail(appraisal.employee, appraisal.cycleNumber, appraisal.dueDate);
    await this.prisma.appraisal.update({ where: { id }, data: { emailSentAt: new Date() } });
    return this.findOneForAdmin(id);
  }

  private appUrl(): string {
    return process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  }

  // Substitutes the Admin Center > Automations template tokens
  // ({{firstName}}, {{cycleLabel}}, {{dueDate}}) into an admin-edited
  // subject/body string. Plain string.replace, not a template engine --
  // deliberately minimal for the one email this app can actually customize
  // today (see AdminSettings model comment).
  private fillTemplate(template: string, tokens: Record<string, string>): string {
    return Object.entries(tokens).reduce((s, [key, value]) => s.split(`{{${key}}}`).join(value), template);
  }

  private async sendTriggerEmail(employee: { id: string; fullName: string; email: string }, cycleNumber: number, dueDate: Date) {
    const settings = await this.prisma.adminSettings.findUnique({ where: { id: 'default' } });
    const firstName = employee.fullName.split(' ')[0];
    const label = cycleLabel(cycleNumber);
    const link = `${this.appUrl()}/my-performance`;
    const dueDateLabel = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const tokens = { firstName, cycleLabel: label, dueDate: dueDateLabel };

    const subject = settings?.appraisalEmailSubjectTemplate
      ? this.fillTemplate(settings.appraisalEmailSubjectTemplate, tokens)
      : `Action Required: Your ${label} Form Is Ready`;
    const introParagraphs = settings?.appraisalEmailBodyTemplate
      ? this.fillTemplate(settings.appraisalEmailBodyTemplate, tokens)
      : `Congratulations on reaching your ${label.toLowerCase()} milestone at OffshoreMitra! As part of our semi-annual review process, please complete your Self-Appraisal form by ${dueDateLabel}. Your inputs, along with project feedback, will be used by management for your performance and compensation review.`;

    const text = `Hi ${firstName},\n\n${introParagraphs}\n\nComplete it here: ${link}\n\n— MitraHR`;
    const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background:#f8fafc;">
  <div style="border-radius: 16px; padding: 3px; background: linear-gradient(135deg, #7c6fff, #5b8def);">
    <div style="background: #ffffff; border-radius: 14px; padding: 32px;">
      <p style="font-size:13px; text-transform:uppercase; letter-spacing:0.08em; color:#7c6fff; font-weight:700; margin:0 0 8px;">${label}</p>
      <h2 style="margin:0 0 16px; color:#1e293b;">${subject}</h2>
      <p style="color:#475569; line-height:1.6;">Hi ${firstName},</p>
      <p style="color:#475569; line-height:1.6;">${introParagraphs}</p>
      <div style="text-align:center; margin:28px 0 8px;">
        <a href="${link}" style="display:inline-block; background: linear-gradient(135deg, #7c6fff, #5b8def); color:#ffffff; text-decoration:none; font-weight:600; padding:12px 32px; border-radius:9999px;">Complete Self-Appraisal</a>
      </div>
    </div>
  </div>
</div>`;
    await this.mail
      .sendMail({ to: employee.email, subject, text, html })
      .catch((err) => this.logger.error(`Failed to send appraisal trigger email to ${employee.email}`, err));
  }

  // --- Employee self-service -------------------------------------------

  async findMine(employeeId: string) {
    const appraisals = await this.prisma.appraisal.findMany({
      where: { employeeId },
      orderBy: { cycleNumber: 'desc' },
      include: { criteriaScores: { include: { criterion: true }, orderBy: { criterion: { sortOrder: 'asc' } } } },
    });
    return Promise.all(appraisals.map((a) => this.serializeForEmployee(a)));
  }

  async findOneForEmployee(employeeId: string, id: string) {
    const appraisal = await this.prisma.appraisal.findUnique({
      where: { id },
      include: {
        criteriaScores: { include: { criterion: true }, orderBy: { criterion: { sortOrder: 'asc' } } },
        skillsAcquired: { include: { skill: true } },
      },
    });
    if (!appraisal || appraisal.employeeId !== employeeId) throw new NotFoundException('Appraisal not found');
    return this.serializeForEmployee(appraisal);
  }

  // Before submission there are no AppraisalCriterionScore rows at all yet
  // (those only get created on submit) — so the form has nothing to render
  // against unless this falls back to the *current* active criteria list.
  // Once submitted, the persisted criteriaScores rows are the source of
  // truth instead, so a later criteria-weight edit in Master Data doesn't
  // retroactively rewrite what an employee already submitted against.
  private async serializeForEmployee(appraisal: any) {
    const hasScores = (appraisal.criteriaScores ?? []).length > 0;
    const criteria = hasScores
      ? appraisal.criteriaScores.map((s: any) => ({
          criterionId: s.criterionId,
          name: s.criterion.name,
          description: s.criterion.description,
          weight: s.criterion.weight,
          selfRating: s.selfRating,
          selfComment: s.selfComment,
          managerRating: appraisal.status === 'COMPLETED' ? s.managerRating : null,
          managerComment: appraisal.status === 'COMPLETED' ? s.managerComment : null,
        }))
      : (await this.prisma.appraisalCriterion.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })).map((c) => ({
          criterionId: c.id,
          name: c.name,
          description: c.description,
          weight: c.weight,
          selfRating: null,
          selfComment: null,
          managerRating: null,
          managerComment: null,
        }));

    return {
      id: appraisal.id,
      cycleNumber: appraisal.cycleNumber,
      cycleLabel: cycleLabel(appraisal.cycleNumber),
      dueDate: appraisal.dueDate,
      status: appraisal.status,
      emailSentAt: appraisal.emailSentAt,
      selfSubmittedAt: appraisal.selfSubmittedAt,
      selfWeightedScore: appraisal.selfWeightedScore,
      managerWeightedScore: appraisal.status === 'COMPLETED' ? appraisal.managerWeightedScore : null,
      currentCTC: appraisal.status === 'COMPLETED' ? appraisal.currentCTC : null,
      incrementPercent: appraisal.status === 'COMPLETED' ? appraisal.incrementPercent : null,
      incrementAmount: appraisal.status === 'COMPLETED' ? appraisal.incrementAmount : null,
      revisedCTC: appraisal.status === 'COMPLETED' ? appraisal.revisedCTC : null,
      effectiveDate: appraisal.status === 'COMPLETED' ? appraisal.effectiveDate : null,
      finalizedAt: appraisal.status === 'COMPLETED' ? appraisal.finalizedAt : null,
      careerGoals: appraisal.selfCareerGoals,
      managementSupport: appraisal.selfManagementSupport,
      certifications: appraisal.selfCertifications,
      skillsAcquired: appraisal.skillsAcquired?.map((s: any) => s.skill) ?? [],
      criteria,
    };
  }

  async submit(employeeId: string, id: string, dto: SubmitAppraisalDto) {
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id } });
    if (!appraisal || appraisal.employeeId !== employeeId) throw new NotFoundException('Appraisal not found');
    if (appraisal.status !== 'PENDING_EMPLOYEE') {
      throw new BadRequestException('This appraisal has already been submitted');
    }
    const criteria = await this.prisma.appraisalCriterion.findMany({ where: { active: true } });
    const criterionById = new Map(criteria.map((c) => [c.id, c]));
    if (dto.criteriaScores.some((s) => !criterionById.has(s.criterionId))) {
      throw new BadRequestException('One or more criteria are invalid or no longer active');
    }
    if (dto.criteriaScores.length < criteria.length) {
      throw new BadRequestException('Rate every criterion before submitting');
    }

    const selfWeightedScore = weightedScore(
      dto.criteriaScores.map((s) => ({ rating: s.selfRating, weight: criterionById.get(s.criterionId)!.weight })),
    );

    await this.prisma.$transaction([
      ...dto.criteriaScores.map((s) =>
        this.prisma.appraisalCriterionScore.upsert({
          where: { appraisalId_criterionId: { appraisalId: id, criterionId: s.criterionId } },
          create: { appraisalId: id, criterionId: s.criterionId, selfRating: s.selfRating, selfComment: s.selfComment },
          update: { selfRating: s.selfRating, selfComment: s.selfComment },
        }),
      ),
      this.prisma.appraisalSkill.deleteMany({ where: { appraisalId: id } }),
      ...(dto.skillIds ?? []).map((skillId) =>
        this.prisma.appraisalSkill.create({ data: { appraisalId: id, skillId } }),
      ),
      this.prisma.appraisal.update({
        where: { id },
        data: {
          status: 'UNDER_MANAGER_REVIEW',
          selfSubmittedAt: new Date(),
          selfCareerGoals: dto.careerGoals,
          selfManagementSupport: dto.managementSupport,
          selfCertifications: dto.certifications,
          selfWeightedScore,
        },
      }),
    ]);

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { fullName: true } });
    await this.notifications.notifyAllStaff({
      type: 'APPRAISAL_SUBMITTED',
      title: `${employee?.fullName ?? 'An employee'} submitted their ${cycleLabel(appraisal.cycleNumber)}`,
      body: 'Ready for manager review in the Appraisal Management Dashboard.',
      link: '/performance?tab=appraisals',
    });

    return this.findOneForEmployee(employeeId, id);
  }

  // --- Admin dashboard ----------------------------------------------------

  async findAllForAdmin() {
    const appraisals = await this.prisma.appraisal.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      include: { employee: { select: EMPLOYEE_CARD_SELECT } },
    });
    return appraisals.map((a) => ({
      id: a.id,
      employee: a.employee,
      cycleNumber: a.cycleNumber,
      cycleLabel: cycleLabel(a.cycleNumber),
      dueDate: a.dueDate,
      status: a.status,
      emailSentAt: a.emailSentAt,
      selfSubmittedAt: a.selfSubmittedAt,
      selfWeightedScore: a.selfWeightedScore,
      managerWeightedScore: a.managerWeightedScore,
      revisedCTC: a.revisedCTC,
    }));
  }

  async findOneForAdmin(id: string) {
    const appraisal = await this.prisma.appraisal.findUnique({
      where: { id },
      include: {
        employee: { select: EMPLOYEE_CARD_SELECT },
        criteriaScores: { include: { criterion: true }, orderBy: { criterion: { sortOrder: 'asc' } } },
        skillsAcquired: { include: { skill: true } },
        managerReviewedBy: { select: { name: true } },
        finalizedBy: { select: { name: true } },
      },
    });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    return {
      id: appraisal.id,
      employee: appraisal.employee,
      cycleNumber: appraisal.cycleNumber,
      cycleLabel: cycleLabel(appraisal.cycleNumber),
      dueDate: appraisal.dueDate,
      status: appraisal.status,
      emailSentAt: appraisal.emailSentAt,
      selfSubmittedAt: appraisal.selfSubmittedAt,
      selfWeightedScore: appraisal.selfWeightedScore,
      managerWeightedScore: appraisal.managerWeightedScore,
      careerGoals: appraisal.selfCareerGoals,
      managementSupport: appraisal.selfManagementSupport,
      certifications: appraisal.selfCertifications,
      skillsAcquired: appraisal.skillsAcquired.map((s) => s.skill),
      managerReviewedByName: appraisal.managerReviewedBy?.name ?? null,
      managerReviewedAt: appraisal.managerReviewedAt,
      finalizedByName: appraisal.finalizedBy?.name ?? null,
      finalizedAt: appraisal.finalizedAt,
      currentCTC: appraisal.currentCTC ?? appraisal.employee.currentCTC,
      incrementPercent: appraisal.incrementPercent,
      incrementAmount: appraisal.incrementAmount,
      revisedCTC: appraisal.revisedCTC,
      effectiveDate: appraisal.effectiveDate,
      criteria: appraisal.criteriaScores.map((s) => ({
        criterionId: s.criterionId,
        name: s.criterion.name,
        description: s.criterion.description,
        weight: s.criterion.weight,
        selfRating: s.selfRating,
        selfComment: s.selfComment,
        managerRating: s.managerRating,
        managerComment: s.managerComment,
      })),
    };
  }

  // Shared by both saveReview (draft) and finalize (locks it) — finalize
  // is just saveReview's data plus the lock step, so this keeps the two
  // from drifting out of sync on what a "review" actually contains.
  private async applyReview(id: string, userId: string, dto: ReviewAppraisalDto) {
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id } });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    if (appraisal.status === 'PENDING_EMPLOYEE') {
      throw new BadRequestException('The employee has not submitted their self-appraisal yet');
    }
    if (appraisal.status === 'COMPLETED') {
      throw new BadRequestException('This appraisal is already finalized');
    }

    const criteria = await this.prisma.appraisalCriterion.findMany({ where: { active: true } });
    const criterionById = new Map(criteria.map((c) => [c.id, c]));
    if (dto.criteriaReviews.some((s) => !criterionById.has(s.criterionId))) {
      throw new BadRequestException('One or more criteria are invalid or no longer active');
    }

    const managerWeightedScore = weightedScore(
      dto.criteriaReviews.map((s) => ({ rating: s.managerRating, weight: criterionById.get(s.criterionId)!.weight })),
    );
    const incrementAmount =
      dto.incrementAmount ?? (dto.currentCTC != null && dto.incrementPercent != null ? (dto.currentCTC * dto.incrementPercent) / 100 : null);
    const revisedCTC = dto.currentCTC != null && incrementAmount != null ? dto.currentCTC + incrementAmount : null;

    await this.prisma.$transaction([
      ...dto.criteriaReviews.map((s) =>
        this.prisma.appraisalCriterionScore.upsert({
          where: { appraisalId_criterionId: { appraisalId: id, criterionId: s.criterionId } },
          create: { appraisalId: id, criterionId: s.criterionId, managerRating: s.managerRating, managerComment: s.managerComment },
          update: { managerRating: s.managerRating, managerComment: s.managerComment },
        }),
      ),
      this.prisma.appraisal.update({
        where: { id },
        data: {
          managerWeightedScore,
          currentCTC: dto.currentCTC,
          incrementPercent: dto.incrementPercent,
          incrementAmount,
          revisedCTC,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
          managerReviewedByUserId: userId,
          managerReviewedAt: new Date(),
        },
      }),
    ]);

    return { managerWeightedScore, revisedCTC };
  }

  async saveReview(id: string, userId: string, dto: ReviewAppraisalDto) {
    await this.applyReview(id, userId, dto);
    return this.findOneForAdmin(id);
  }

  async finalize(id: string, userId: string, dto: FinalizeAppraisalDto, actor?: AuditActor) {
    await this.applyReview(id, userId, dto);
    // Re-checked against the DB rather than just this call's payload --
    // ratings may have been built up across several earlier saveReview
    // drafts, so completeness has to be judged by what's actually stored,
    // not by what this one finalize request happened to include.
    const [activeCriteriaCount, ratedCount] = await Promise.all([
      this.prisma.appraisalCriterion.count({ where: { active: true } }),
      this.prisma.appraisalCriterionScore.count({ where: { appraisalId: id, managerRating: { not: null } } }),
    ]);
    if (ratedCount < activeCriteriaCount) {
      throw new BadRequestException('Rate every active criterion before finalizing');
    }
    if (dto.currentCTC == null || (dto.incrementPercent == null && dto.incrementAmount == null) || !dto.effectiveDate) {
      throw new BadRequestException('Current CTC, an increment, and an effective date are required to finalize');
    }

    const appraisal = await this.prisma.appraisal.update({
      where: { id },
      data: { status: 'COMPLETED', finalizedAt: new Date(), finalizedByUserId: userId },
      include: { employee: { select: { id: true, fullName: true, email: true, emailOnAppraisal: true } } },
    });

    if (appraisal.revisedCTC != null) {
      await this.prisma.employee.update({ where: { id: appraisal.employeeId }, data: { currentCTC: appraisal.revisedCTC } });
    }

    if (actor) {
      await this.prisma.auditLog
        .create({
          data: auditEntry(
            actor,
            'HR',
            'UPDATE',
            `Finalized ${appraisal.employee.fullName}'s ${cycleLabel(appraisal.cycleNumber)}${
              appraisal.revisedCTC != null ? ` -- compensation updated to ${appraisal.revisedCTC}` : ''
            }`,
            { severity: 'CRITICAL' },
          ),
        })
        .catch(() => {});
    }

    await this.notifications.notifyEmployee(appraisal.employeeId, {
      type: 'APPRAISAL_FINALIZED',
      title: `Your ${cycleLabel(appraisal.cycleNumber)} has been finalized`,
      body: 'View your results and appraisal letter in My Performance.',
      employeeLink: '/my-performance',
      staffLink: '/my-performance',
    });
    if (appraisal.employee.emailOnAppraisal) {
      await this.mail
        .sendMail({
          to: appraisal.employee.email,
          subject: `Your ${cycleLabel(appraisal.cycleNumber)} Has Been Finalized`,
          text: `Hi ${appraisal.employee.fullName.split(' ')[0]},\n\nYour ${cycleLabel(appraisal.cycleNumber)} has been reviewed and finalized. Log in to MitraHR under My Performance to view your results and appraisal letter.\n\n— MitraHR`,
        })
        .catch((err) => this.logger.error('Failed to send appraisal-finalized email', err));
    }

    return this.findOneForAdmin(id);
  }

  // Called by StaffOnlyGuard-protected "Employees" pages/forms if they ever
  // want to let an admin set/correct an employee's CTC directly, outside an
  // appraisal cycle. Not currently wired to a route, kept here so the
  // Appraisal Review drawer and any future payroll UI share one code path.
  async setEmployeeCTC(employeeId: string, currentCTC: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({ where: { id: employeeId }, data: { currentCTC } });
  }
}
