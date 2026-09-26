import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpsertQuizDto } from './dto/upsert-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { CATEGORY_TRACK, TRACK_LABELS, LearningTrack, categoriesForTrack, isLearningTrack } from '../training/track-categories';

const QUIZ_INCLUDE_STAFF = {
  questions: { orderBy: { order: 'asc' as const }, include: { options: { orderBy: { order: 'asc' as const } } } },
};

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  // --- Staff authoring: course-scoped (IAM / DevOps assessments) ---

  getForCourseStaff(courseId: string) {
    return this.prisma.quiz.findUnique({ where: { courseId }, include: QUIZ_INCLUDE_STAFF });
  }

  async upsertForCourse(courseId: string, dto: UpsertQuizDto) {
    const course = await this.prisma.trainingCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    this.validateQuestions(dto);
    const existing = await this.prisma.quiz.findUnique({ where: { courseId } });
    return this.saveQuiz(existing, { courseId }, dto);
  }

  async removeForCourse(courseId: string) {
    const existing = await this.prisma.quiz.findUnique({ where: { courseId } });
    if (!existing) throw new NotFoundException('Assessment not found');
    await this.prisma.quiz.delete({ where: { id: existing.id } });
    return { success: true };
  }

  // --- Staff authoring: track-scoped (Mandatory Training assessment) ---

  getForTrackStaff(track: string) {
    this.assertKnownTrack(track);
    return this.prisma.quiz.findUnique({ where: { track }, include: QUIZ_INCLUDE_STAFF });
  }

  async upsertForTrack(track: string, dto: UpsertQuizDto) {
    this.assertKnownTrack(track);
    this.validateQuestions(dto);
    const existing = await this.prisma.quiz.findUnique({ where: { track } });
    return this.saveQuiz(existing, { track }, dto);
  }

  async removeForTrack(track: string) {
    this.assertKnownTrack(track);
    const existing = await this.prisma.quiz.findUnique({ where: { track } });
    if (!existing) throw new NotFoundException('Assessment not found');
    await this.prisma.quiz.delete({ where: { id: existing.id } });
    return { success: true };
  }

  // Employee-facing discovery for the track-wide assessment — there is no
  // single course to hang a "Take Assessment" button off of, so the
  // frontend calls this first to learn whether one exists, whether it's
  // unlocked yet (ALL of the employee's assigned courses in the track must
  // be COMPLETED — not just one), and, if so, the quiz id to pass to
  // /quizzes/:id/take.
  async trackQuizStatus(track: string, employeeId: string) {
    this.assertKnownTrack(track);
    const quiz = await this.prisma.quiz.findUnique({ where: { track } });
    const progress = await this.trackProgress(employeeId, track as LearningTrack);
    if (!quiz || !quiz.active) {
      return { quiz: null, unlocked: false, ...progress };
    }
    return {
      quiz: { id: quiz.id, title: quiz.title, passPercent: quiz.passPercent },
      unlocked: progress.totalCourses > 0 && progress.completedCourses === progress.totalCourses,
      ...progress,
    };
  }

  private async trackProgress(employeeId: string, track: LearningTrack) {
    const categories = categoriesForTrack(track);
    const assignments = await this.prisma.employeeTraining.findMany({
      where: { employeeId, course: { category: { in: categories } } },
      select: { status: true },
    });
    return {
      totalCourses: assignments.length,
      completedCourses: assignments.filter((a) => a.status === 'COMPLETED').length,
    };
  }

  private assertKnownTrack(track: string) {
    if (!isLearningTrack(track)) throw new BadRequestException('Unknown training track');
  }

  private validateQuestions(dto: UpsertQuizDto) {
    for (const q of dto.questions) {
      if (!q.options.some((o) => o.isCorrect)) {
        throw new BadRequestException(`Question "${q.text}" needs one option marked correct`);
      }
    }
  }

  // Shared wholesale-replace save, used by both the course-scoped and
  // track-scoped authoring paths. `existing` is the current quiz (or null),
  // `createScope` is whichever of {courseId} / {track} identifies a new
  // quiz — Quiz's CHECK constraint requires exactly one of them ever be set.
  private async saveQuiz(existing: { id: string } | null, createScope: { courseId: string } | { track: string }, dto: UpsertQuizDto) {
    const data = {
      title: dto.title || 'Knowledge Check',
      passPercent: dto.passPercent ?? 70,
      active: dto.active ?? true,
    };
    const questionsCreate = {
      create: dto.questions.map((q, qi) => ({
        text: q.text,
        order: qi,
        options: { create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, order: oi })) },
      })),
    };

    if (existing) {
      // Questions/options are small in number and replaced wholesale on
      // save (same pattern as TrainingCourse.resources) — simpler than
      // diffing rows. Past QuizAttempts are untouched: their totals/percent
      // are frozen at submit time, and QuizAttemptAnswer.selectedOptionId
      // just goes null via ON DELETE SET NULL if its option is removed, so
      // editing a quiz later never rewrites someone's history.
      await this.prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
      return this.prisma.quiz.update({
        where: { id: existing.id },
        data: { ...data, questions: questionsCreate },
        include: QUIZ_INCLUDE_STAFF,
      });
    }

    return this.prisma.quiz.create({
      data: { ...createScope, ...data, questions: questionsCreate },
      include: QUIZ_INCLUDE_STAFF,
    });
  }

  // --- Employee take/submit ---

  async getForEmployee(quizId: string, employeeId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { ...QUIZ_INCLUDE_STAFF, course: true } });
    if (!quiz || !quiz.active) throw new NotFoundException('Assessment not found');
    await this.assertUnlocked(employeeId, quiz);

    // Strip correct-answer flags — this is the whole point of "for employee".
    return {
      id: quiz.id,
      courseId: quiz.courseId,
      track: quiz.track,
      subjectTitle: this.subjectTitle(quiz),
      title: quiz.title,
      passPercent: quiz.passPercent,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    };
  }

  private subjectTitle(quiz: any): string {
    if (quiz.courseId) return quiz.course?.title || 'Course';
    return TRACK_LABELS[quiz.track as LearningTrack] || quiz.track;
  }

  private async assertUnlocked(employeeId: string, quiz: any) {
    if (quiz.courseId) {
      await this.assertCompletedAssignment(employeeId, quiz.courseId);
    } else {
      const progress = await this.trackProgress(employeeId, quiz.track as LearningTrack);
      if (progress.totalCourses === 0) {
        throw new ForbiddenException('No courses in this track are assigned to you');
      }
      if (progress.completedCourses !== progress.totalCourses) {
        throw new BadRequestException('Complete all of your assigned courses in this track before taking this assessment');
      }
    }
  }

  private async assertCompletedAssignment(employeeId: string, courseId: string) {
    const assignment = await this.prisma.employeeTraining.findUnique({
      where: { employeeId_courseId: { employeeId, courseId } },
    });
    if (!assignment) throw new ForbiddenException('This course is not assigned to you');
    if (assignment.status !== 'COMPLETED') {
      throw new BadRequestException('Mark this course as Completed before taking its assessment');
    }
  }

  async submit(quizId: string, employeeId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId }, include: { ...QUIZ_INCLUDE_STAFF, course: true } });
    if (!quiz || !quiz.active) throw new NotFoundException('Assessment not found');
    await this.assertUnlocked(employeeId, quiz);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, designation: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const answerByQuestion = new Map(dto.answers.map((a) => [a.questionId, a.selectedOptionId || null]));
    let correctCount = 0;
    const answerRows = quiz.questions.map((q) => {
      const selectedOptionId = answerByQuestion.get(q.id) || null;
      const correctOption = q.options.find((o) => o.isCorrect);
      const isCorrect = !!selectedOptionId && selectedOptionId === correctOption?.id;
      if (isCorrect) correctCount++;
      return { questionId: q.id, selectedOptionId, isCorrect };
    });

    const totalQuestions = quiz.questions.length;
    const incorrectCount = totalQuestions - correctCount;
    const percent = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);
    const passed = percent >= quiz.passPercent;

    const attempt = await this.prisma.quizAttempt.create({
      data: { quizId, employeeId, totalQuestions, correctCount, incorrectCount, percent, passed, answers: { create: answerRows } },
    });

    const subject = this.subjectTitle(quiz);

    // Best-effort side effects — never let a notification/email failure
    // block the employee from seeing their own graded result below.
    this.notifications
      .notifyEmployee(employeeId, {
        type: 'QUIZ_RESULT',
        title: `You scored ${percent}% on "${subject}" (${passed ? 'Passed' : 'Not passed'})`,
        employeeLink: '/my-learning',
        staffLink: '/training',
      })
      .catch(() => {});
    this.notifications
      .notifyAllStaff({
        type: 'QUIZ_RESULT',
        title: `${employee.fullName} scored ${percent}% on "${subject}" (${passed ? 'Passed' : 'Not passed'})`,
        link: '/training',
      })
      .catch(() => {});
    this.sendResultEmails(employee, quiz, attempt).catch(() => {});

    return {
      id: attempt.id,
      quizId,
      subjectTitle: subject,
      totalQuestions,
      correctCount,
      incorrectCount,
      percent,
      passed,
      passPercent: quiz.passPercent,
      submittedAt: attempt.submittedAt,
      // Safe to reveal correct answers now that the attempt is recorded —
      // powers the post-submit review screen.
      review: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        selectedOptionId: answerByQuestion.get(q.id) || null,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      })),
    };
  }

  // --- Results / dashboard ---

  async resultsForStaff(categories?: string[]) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: this.scopeFilter(categories),
      include: this.resultInclude(),
      orderBy: { submittedAt: 'desc' },
    });
    return attempts.map((a) => this.toResultRow(a));
  }

  async myResults(employeeId: string, categories?: string[]) {
    const scope = this.scopeFilter(categories);
    const attempts = await this.prisma.quizAttempt.findMany({
      where: scope ? { employeeId, ...scope } : { employeeId },
      include: this.resultInclude(),
      orderBy: { submittedAt: 'desc' },
    });
    return attempts.map((a) => this.toResultRow(a));
  }

  // categories may span course-scoped quizzes (match via quiz.course.category)
  // and/or the track-wide quiz whose attempts have no course at all (match
  // via quiz.track) — a Mandatory-tab results view needs both halves.
  private scopeFilter(categories?: string[]) {
    if (!categories?.length) return undefined;
    const tracks = Array.from(new Set(categories.map((c) => CATEGORY_TRACK[c]).filter(Boolean)));
    return {
      OR: [
        { quiz: { course: { category: { in: categories } } } },
        ...(tracks.length ? [{ quiz: { track: { in: tracks } } }] : []),
      ],
    };
  }

  private resultInclude() {
    return {
      quiz: { include: { course: true } },
      employee: {
        select: {
          id: true,
          fullName: true,
          employeeCode: true,
          photoUrl: true,
          department: { select: { name: true } },
          designation: { select: { name: true } },
        },
      },
    };
  }

  private toResultRow(a: any) {
    return {
      id: a.id,
      quizId: a.quizId,
      courseId: a.quiz.courseId,
      track: a.quiz.track,
      subjectTitle: this.subjectTitle(a.quiz),
      category: a.quiz.course?.category ?? null,
      employeeId: a.employeeId,
      employeeName: a.employee.fullName,
      employeeCode: a.employee.employeeCode,
      employeePhotoUrl: a.employee.photoUrl,
      departmentName: a.employee.department?.name || null,
      designationName: a.employee.designation?.name || null,
      totalQuestions: a.totalQuestions,
      correctCount: a.correctCount,
      incorrectCount: a.incorrectCount,
      percent: a.percent,
      passed: a.passed,
      submittedAt: a.submittedAt,
    };
  }

  async dashboardStats(categories?: string[]) {
    const rows = await this.resultsForStaff(categories);
    const totalAttempts = rows.length;
    const passedCount = rows.filter((r) => r.passed).length;
    const avgPercent = totalAttempts === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.percent, 0) / totalAttempts);
    // "Certificates issued" = distinct (employee, subject) pairs with at
    // least one passing attempt — a retake that finally passes counts once.
    // subject is the courseId for course-scoped quizzes or the track key
    // for the track-wide one, so the two scopes never collide.
    const certifiedPairs = new Set(rows.filter((r) => r.passed).map((r) => `${r.employeeId}:${r.courseId || `track:${r.track}`}`));
    return {
      totalAttempts,
      passedCount,
      passRatePercent: totalAttempts === 0 ? 0 : Math.round((passedCount / totalAttempts) * 100),
      avgPercent,
      certificatesIssued: certifiedPairs.size,
    };
  }

  // --- Certificate email ---

  private async sendResultEmails(employee: any, quiz: any, attempt: any) {
    const admins = await this.prisma.user.findMany({ select: { email: true } });
    const html = this.buildCertificateHtml(employee, quiz, attempt);
    const text = this.buildCertificateText(employee, quiz, attempt);
    const subject = `Assessment Result: ${employee.fullName} — "${this.subjectTitle(quiz)}" (${attempt.percent}%)`;
    // The employee's own copy respects their emailOnAssessmentResult
    // preference; admin oversight/certification-record copies are not the
    // employee's preference to control and always go out.
    const recipients = Array.from(
      new Set([...(employee.emailOnAssessmentResult ? [employee.email] : []), ...admins.map((a) => a.email)]),
    );
    await Promise.all(recipients.map((to) => this.mail.sendMail({ to, subject, text, html }).catch(() => {})));
  }

  private buildCertificateText(employee: any, quiz: any, attempt: any): string {
    const subjectLabel = quiz.courseId ? 'Course' : 'Track';
    return [
      'Assessment Result Certificate',
      '',
      `Employee: ${employee.fullName}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}`,
      `Department: ${employee.department?.name || '-'}   Designation: ${employee.designation?.name || '-'}`,
      `${subjectLabel}: ${this.subjectTitle(quiz)}`,
      quiz.course?.category ? `Category: ${quiz.course.category}` : '',
      '',
      `Questions Attempted: ${attempt.totalQuestions}`,
      `Correct: ${attempt.correctCount}   Incorrect: ${attempt.incorrectCount}`,
      `Score: ${attempt.percent}%   Result: ${attempt.passed ? 'PASSED' : 'NOT PASSED'} (pass mark ${quiz.passPercent}%)`,
      `Date: ${new Date(attempt.submittedAt).toLocaleString()}`,
    ].filter(Boolean).join('\n');
  }

  private buildCertificateHtml(employee: any, quiz: any, attempt: any): string {
    const passed = attempt.passed;
    const ribbonColor = passed ? '#059669' : '#dc2626';
    const ribbonBg = passed ? '#d1fae5' : '#fee2e2';
    const subjectLabel = quiz.courseId ? 'Course' : 'Track';
    return `
<div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background:#f8fafc;">
  <div style="border-radius: 16px; padding: 3px; background: linear-gradient(135deg, #7c6fff, #5b8def);">
    <div style="background: #ffffff; border-radius: 14px; padding: 32px;">
      <p style="text-transform:uppercase; letter-spacing:2px; font-size:11px; color:#7c6fff; font-weight:700; margin:0 0 4px;">MitraHR &middot; Certificate of Completion</p>
      <h1 style="font-size:22px; margin:0 0 24px; color:#1e293b;">Assessment Result</h1>

      <table style="width:100%; border-collapse:collapse; font-size:14px; color:#334155;">
        <tr><td style="padding:4px 0; color:#64748b; width:130px;">Employee</td><td style="padding:4px 0; font-weight:600;">${employee.fullName}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}</td></tr>
        <tr><td style="padding:4px 0; color:#64748b;">Department</td><td style="padding:4px 0;">${employee.department?.name || '—'}</td></tr>
        <tr><td style="padding:4px 0; color:#64748b;">Designation</td><td style="padding:4px 0;">${employee.designation?.name || '—'}</td></tr>
        <tr><td style="padding:4px 0; color:#64748b;">${subjectLabel}</td><td style="padding:4px 0; font-weight:600;">${this.subjectTitle(quiz)}</td></tr>
        <tr><td style="padding:4px 0; color:#64748b;">Date</td><td style="padding:4px 0;">${new Date(attempt.submittedAt).toLocaleString()}</td></tr>
      </table>

      <table style="width:100%; border-collapse:separate; border-spacing:8px 0; margin-top:20px;">
        <tr>
          <td style="background:#f1f5f9; border-radius:10px; padding:14px; text-align:center; width:33%;">
            <div style="font-size:22px; font-weight:700; color:#1e293b;">${attempt.totalQuestions}</div>
            <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Attempted</div>
          </td>
          <td style="background:#f1f5f9; border-radius:10px; padding:14px; text-align:center; width:33%;">
            <div style="font-size:22px; font-weight:700; color:#059669;">${attempt.correctCount}</div>
            <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Correct</div>
          </td>
          <td style="background:#f1f5f9; border-radius:10px; padding:14px; text-align:center; width:33%;">
            <div style="font-size:22px; font-weight:700; color:#dc2626;">${attempt.incorrectCount}</div>
            <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Incorrect</div>
          </td>
        </tr>
      </table>

      <div style="margin-top:20px; text-align:center;">
        <div style="display:inline-block; border-radius:9999px; padding:10px 28px; background:${ribbonBg}; color:${ribbonColor}; font-weight:700; font-size:20px;">
          ${attempt.percent}% — ${passed ? 'PASSED' : 'NOT PASSED'}
        </div>
        <p style="margin:8px 0 0; font-size:12px; color:#94a3b8;">Pass mark: ${quiz.passPercent}%</p>
      </div>
    </div>
  </div>
  <p style="text-align:center; font-size:11px; color:#94a3b8; margin-top:16px;">This is an automated message from MitraHR Learning Center.</p>
</div>`;
  }
}
