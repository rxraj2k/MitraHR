import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePulseSurveyDto } from './dto/create-pulse-survey.dto';
import { UpdatePulseSurveyDto } from './dto/update-pulse-survey.dto';
import { SubmitPulseSurveyResponseDto } from './dto/submit-pulse-survey-response.dto';

export interface SessionUser {
  kind: 'STAFF' | 'EMPLOYEE';
  sub: string;
  employeeId?: string | null;
}

const SURVEY_INCLUDE = {
  questions: { orderBy: { order: 'asc' as const } },
  audienceDepartments: { select: { departmentId: true } },
  _count: { select: { responses: true } },
};

// Lightweight, deterministic keyword heuristic for tagging free-text pulse
// answers as Positive / Neutral / Needs Attention on the anonymized
// feedback feed. This is NOT real NLP/ML sentiment analysis — it is a
// simple, explainable stand-in appropriate for this app's current scope.
const POSITIVE_WORDS = [
  'great', 'love', 'helpful', 'good', 'awesome', 'appreciate', 'fair', 'excellent',
  'enjoy', 'supportive', 'proud', 'smooth', 'no complaints', 'happy', 'well',
];
const NEGATIVE_WORDS = [
  'frustrat', 'block', 'issue', 'problem', 'heavy', 'confus', 'lack', 'friction',
  'concern', 'difficult', 'poor', 'worse', 'burnout', 'overwhelm', 'unclear', 'delay',
];

function classifySentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEEDS_ATTENTION' {
  const lower = text.toLowerCase();
  const hasPositive = POSITIVE_WORDS.some((w) => lower.includes(w));
  const hasNegative = NEGATIVE_WORDS.some((w) => lower.includes(w));
  if (hasNegative && !hasPositive) return 'NEEDS_ATTENTION';
  if (hasPositive && !hasNegative) return 'POSITIVE';
  return 'NEUTRAL';
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

@Injectable()
export class PulseSurveysService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findOneRaw(id: string) {
    const survey = await this.prisma.pulseSurvey.findUnique({ where: { id }, include: SURVEY_INCLUDE });
    if (!survey) throw new NotFoundException('Pulse survey not found');
    return survey;
  }

  async create(createdById: string, dto: CreatePulseSurveyDto) {
    const audienceType = dto.audienceType || 'ALL';
    if (audienceType === 'DEPARTMENTS' && !(dto.audienceDepartmentIds && dto.audienceDepartmentIds.length > 0)) {
      throw new ForbiddenException('Select at least one department to target');
    }
    const survey = await this.prisma.pulseSurvey.create({
      data: {
        title: dto.title,
        description: dto.description,
        audienceType,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
        createdById,
        questions: { create: dto.questions.map((q, i) => ({ text: q.text, type: q.type, order: i })) },
        audienceDepartments:
          audienceType === 'DEPARTMENTS' && dto.audienceDepartmentIds
            ? { create: dto.audienceDepartmentIds.map((departmentId) => ({ departmentId })) }
            : undefined,
      },
      include: SURVEY_INCLUDE,
    });
    return survey;
  }

  async update(id: string, dto: UpdatePulseSurveyDto) {
    const existing = await this.findOneRaw(id);
    const launchingNow = dto.status === 'ACTIVE' && existing.status !== 'ACTIVE';
    const survey = await this.prisma.pulseSurvey.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        closesAt: dto.closesAt === undefined ? undefined : dto.closesAt ? new Date(dto.closesAt) : null,
      },
      include: SURVEY_INCLUDE,
    });
    if (launchingNow) {
      await this.notifications.notifyAllStaff({
        type: 'PULSE_SURVEY_LAUNCHED',
        title: `Pulse survey launched: ${survey.title}`,
        link: '/engagement',
      });
    }
    return survey;
  }

  async remove(id: string) {
    await this.findOneRaw(id);
    await this.prisma.pulseSurvey.delete({ where: { id } });
    return { success: true };
  }

  private async eligibleEmployeeIds(survey: { audienceType: string; audienceDepartments: { departmentId: string }[] }) {
    if (survey.audienceType === 'DEPARTMENTS') {
      const rows = await this.prisma.employee.findMany({
        where: { status: 'ACTIVE', departmentId: { in: survey.audienceDepartments.map((d) => d.departmentId) } },
        select: { id: true },
      });
      return rows.map((r) => r.id);
    }
    const rows = await this.prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  private isVisibleTo(survey: { audienceType: string; audienceDepartments: { departmentId: string }[] }, viewerDepartmentId: string | null) {
    if (survey.audienceType !== 'DEPARTMENTS') return true;
    return !!viewerDepartmentId && survey.audienceDepartments.some((d) => d.departmentId === viewerDepartmentId);
  }

  // Staff see every survey (any status) so they can manage what they've
  // created. An employee only ever sees ACTIVE/CLOSED surveys targeted at
  // them — never a DRAFT still being put together.
  async findAllForViewer(user: SessionUser) {
    const isStaff = user.kind === 'STAFF';
    const surveys = await this.prisma.pulseSurvey.findMany({
      where: isStaff ? undefined : { status: { in: ['ACTIVE', 'CLOSED'] } },
      include: { ...SURVEY_INCLUDE, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    let viewerDepartmentId: string | null = null;
    if (!isStaff && viewerEmployeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: viewerEmployeeId }, select: { departmentId: true } });
      viewerDepartmentId = employee?.departmentId ?? null;
    }

    const visible = isStaff ? surveys : surveys.filter((s) => this.isVisibleTo(s, viewerDepartmentId));

    const respondedIds = viewerEmployeeId
      ? new Set(
          (
            await this.prisma.pulseSurveyResponse.findMany({
              where: { employeeId: viewerEmployeeId, surveyId: { in: visible.map((s) => s.id) } },
              select: { surveyId: true },
            })
          ).map((r) => r.surveyId),
        )
      : new Set<string>();

    // Response-rate progress bars on the list cards need eligibleCount up
    // front (not just inside the detail/results views) — cheap enough at
    // this app's scale (one query per visible survey).
    const eligibleCounts = await Promise.all(visible.map((s) => this.eligibleEmployeeIds(s)));

    return visible.map((s, i) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      audienceType: s.audienceType,
      audienceDepartmentIds: s.audienceDepartments.map((d) => d.departmentId),
      closesAt: s.closesAt,
      createdByName: (s as any).createdBy?.name,
      createdAt: s.createdAt,
      questions: s.questions,
      responseCount: s._count.responses,
      eligibleCount: eligibleCounts[i].length,
      respondedByMe: respondedIds.has(s.id),
    }));
  }

  async findOneForViewer(id: string, user: SessionUser) {
    const survey = await this.prisma.pulseSurvey.findUnique({
      where: { id },
      include: { ...SURVEY_INCLUDE, createdBy: { select: { id: true, name: true } } },
    });
    if (!survey) throw new NotFoundException('Pulse survey not found');
    const isStaff = user.kind === 'STAFF';
    const viewerEmployeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId ?? null;
    if (!isStaff) {
      if (survey.status === 'DRAFT') throw new NotFoundException('Pulse survey not found');
      const employee = viewerEmployeeId
        ? await this.prisma.employee.findUnique({ where: { id: viewerEmployeeId }, select: { departmentId: true } })
        : null;
      if (!this.isVisibleTo(survey, employee?.departmentId ?? null)) throw new NotFoundException('Pulse survey not found');
    }
    let myResponse: Prisma.PulseSurveyResponseGetPayload<{ include: { answers: true } }> | null = null;
    if (viewerEmployeeId) {
      myResponse = await this.prisma.pulseSurveyResponse.findUnique({
        where: { surveyId_employeeId: { surveyId: id, employeeId: viewerEmployeeId } },
        include: { answers: true },
      });
    }
    const eligibleCount = (await this.eligibleEmployeeIds(survey)).length;
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      audienceType: survey.audienceType,
      audienceDepartmentIds: survey.audienceDepartments.map((d) => d.departmentId),
      closesAt: survey.closesAt,
      createdByName: (survey as any).createdBy?.name,
      createdAt: survey.createdAt,
      questions: survey.questions,
      responseCount: survey._count.responses,
      eligibleCount,
      respondedByMe: !!myResponse,
      myAnswers: myResponse ? myResponse.answers : null,
    };
  }

  async submitResponse(surveyId: string, user: SessionUser, dto: SubmitPulseSurveyResponseDto) {
    const employeeId = user.kind === 'EMPLOYEE' ? user.sub : user.employeeId;
    if (!employeeId) throw new ForbiddenException('This action requires an employee record linked to your account');
    const survey = await this.findOneRaw(surveyId);
    if (survey.status !== 'ACTIVE') throw new ForbiddenException('This survey is not currently accepting responses');
    const validQuestionIds = new Set(survey.questions.map((q) => q.id));
    for (const a of dto.answers) {
      if (!validQuestionIds.has(a.questionId)) throw new ForbiddenException('One of the answers references an unknown question');
    }

    const existing = await this.prisma.pulseSurveyResponse.findUnique({
      where: { surveyId_employeeId: { surveyId, employeeId } },
    });
    if (existing) {
      await this.prisma.pulseSurveyAnswer.deleteMany({ where: { responseId: existing.id } });
      await this.prisma.pulseSurveyAnswer.createMany({
        data: dto.answers.map((a) => ({
          responseId: existing.id,
          questionId: a.questionId,
          ratingValue: a.ratingValue,
          boolValue: a.boolValue,
          textValue: a.textValue,
        })),
      });
      return { success: true, updated: true };
    }

    await this.prisma.pulseSurveyResponse.create({
      data: {
        surveyId,
        employeeId,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            ratingValue: a.ratingValue,
            boolValue: a.boolValue,
            textValue: a.textValue,
          })),
        },
      },
    });
    return { success: true, updated: false };
  }

  // Aggregate-only, never per-employee — see the PulseSurveyResponse model
  // comment in schema.prisma. Staff can preview anytime; an employee only
  // once the survey is CLOSED (results reveal after close, so answers stay
  // candid while the survey is live).
  async getResults(surveyId: string, user: SessionUser) {
    const survey = await this.findOneRaw(surveyId);
    const isStaff = user.kind === 'STAFF';
    if (!isStaff && survey.status !== 'CLOSED') {
      throw new ForbiddenException('Results are available once this survey closes');
    }
    const eligibleCount = (await this.eligibleEmployeeIds(survey)).length;
    const responseCount = survey._count.responses;

    const answers = await this.prisma.pulseSurveyAnswer.findMany({
      where: { question: { surveyId } },
      select: { questionId: true, ratingValue: true, boolValue: true, textValue: true },
    });

    const byQuestion = survey.questions.map((q) => {
      const qAnswers = answers.filter((a) => a.questionId === q.id);
      if (q.type === 'RATING') {
        const ratings = qAnswers.map((a) => a.ratingValue).filter((v): v is number => typeof v === 'number');
        const distribution = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r === n).length);
        const average = ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null;
        return { questionId: q.id, text: q.text, type: q.type, average, distribution, responseCount: ratings.length };
      }
      if (q.type === 'YES_NO') {
        const bools = qAnswers.map((a) => a.boolValue).filter((v): v is boolean => typeof v === 'boolean');
        const yes = bools.filter((b) => b).length;
        const no = bools.length - yes;
        return { questionId: q.id, text: q.text, type: q.type, yes, no, responseCount: bools.length };
      }
      const texts = qAnswers.map((a) => a.textValue).filter((v): v is string => !!v && v.trim().length > 0);
      return { questionId: q.id, text: q.text, type: q.type, responses: texts, responseCount: texts.length };
    });

    return {
      surveyId,
      title: survey.title,
      status: survey.status,
      eligibleCount,
      responseCount,
      responseRatePercent: eligibleCount > 0 ? Math.round((responseCount / eligibleCount) * 100) : 0,
      questions: byQuestion,
    };
  }

  // Company-wide engagement snapshot for the Pulse Surveys tab header — an
  // eNPS-style score derived from every RATING answer ever collected (1-2
  // = detractor, 3-4 = passive, 5 = promoter), a 6-month trend, and an
  // anonymized, sentiment-tagged sample of recent free-text feedback drawn
  // only from CLOSED surveys (so a still-open survey's candid answers stay
  // private until it closes, matching getResults' visibility rule).
  async getInsights() {
    const ratingAnswers = await this.prisma.pulseSurveyAnswer.findMany({
      where: { ratingValue: { not: null } },
      select: { ratingValue: true, response: { select: { submittedAt: true } } },
    });

    const total = ratingAnswers.length;
    let promoters = 0;
    let detractors = 0;
    let passives = 0;
    const monthBuckets = new Map<string, { promoters: number; detractors: number; total: number }>();

    for (const a of ratingAnswers) {
      const rating = a.ratingValue as number;
      const isPromoter = rating >= 5;
      const isDetractor = rating <= 2;
      if (isPromoter) promoters++;
      else if (isDetractor) detractors++;
      else passives++;

      const d = a.response.submittedAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBuckets.get(key) || { promoters: 0, detractors: 0, total: 0 };
      bucket.total++;
      if (isPromoter) bucket.promoters++;
      else if (isDetractor) bucket.detractors++;
      monthBuckets.set(key, bucket);
    }

    const enpsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    const sentimentLabel: 'Healthy' | 'Needs Attention' | 'Critical' =
      enpsScore >= 30 ? 'Healthy' : enpsScore >= 0 ? 'Needs Attention' : 'Critical';

    const trend = Array.from(monthBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, b]) => ({
        label: monthLabel(key),
        score: b.total > 0 ? Math.round(((b.promoters - b.detractors) / b.total) * 100) : 0,
      }));

    const textAnswers = await this.prisma.pulseSurveyAnswer.findMany({
      where: { textValue: { not: null }, question: { survey: { status: 'CLOSED' } } },
      select: {
        textValue: true,
        response: { select: { submittedAt: true } },
        question: { select: { survey: { select: { title: true } } } },
      },
      orderBy: { response: { submittedAt: 'desc' } },
      take: 12,
    });

    const feedback = textAnswers
      .filter((a) => !!a.textValue && a.textValue.trim().length > 0)
      .map((a) => ({
        text: a.textValue as string,
        sentiment: classifySentiment(a.textValue as string),
        surveyTitle: a.question.survey.title,
        submittedAt: a.response.submittedAt,
      }));

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      enpsScore,
      sentimentLabel,
      promoterPercent: pct(promoters),
      passivePercent: pct(passives),
      detractorPercent: pct(detractors),
      totalRatingResponses: total,
      trend,
      feedback,
    };
  }
}
