// Standalone mock-data seed for the Employee Engagement & Feedback module
// (peer recognition/kudos wall + leaderboard + pulse surveys + eNPS
// analytics). Run separately from the main seed.ts, same pattern as
// seed-recruitment.ts and seed-performance.ts:
//   npx ts-node prisma/seed-engagement.ts
//
// Safe to re-run: recognitions are looked up by (fromEmployeeId,
// toEmployeeId, message) before creating, and pulse surveys by title,
// so running it twice won't create duplicate top-level rows. Reactions,
// comments, questions and responses are only added the first time their
// parent row is created.
//
// Links to real Employee / Department records already in this database
// rather than inventing orphaned IDs — same precedent as
// seed-recruitment.ts / seed-performance.ts.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' }, take: 15 });
  if (employees.length < 4) {
    console.log('Not enough employees found in the database — run the main seed first. Skipping engagement seed.');
    return;
  }

  const admin = await prisma.employee.findFirst({ where: { systemRole: 'ADMINISTRATOR' }, orderBy: { createdAt: 'asc' } });
  const sanjay = await prisma.employee.findFirst({ where: { fullName: 'Sanjay Saraf' } });
  const devopsDept = await prisma.department.findFirst({ where: { name: 'DevOps' } });
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMINISTRATOR' }, orderBy: { createdAt: 'asc' } });
  const anyUser = adminUser || (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!anyUser) {
    console.log('No User record found to attribute pulse surveys to — run the main seed first. Skipping engagement seed.');
    return;
  }

  const e0 = employees[0];
  const e1 = employees[1];
  const e2 = employees[2];
  const e3 = employees[3];
  const e4 = employees[4] || employees[0];
  const companyOwner = admin || sanjay || e0;

  // --- Recognition / kudos wall -------------------------------------------

  async function findOrCreateRecognition(input: {
    fromEmployeeId: string;
    toEmployeeId: string;
    category: string;
    message: string;
    points?: number;
    daysBack: number;
    reactions?: { employeeId: string; type: string }[];
    comments?: { employeeId: string; body: string; daysBack: number }[];
  }) {
    const existing = await prisma.recognition.findFirst({
      where: { fromEmployeeId: input.fromEmployeeId, toEmployeeId: input.toEmployeeId, message: input.message },
    });
    if (existing) {
      console.log(`Recognition "${input.message.slice(0, 30)}..." already exists — skipping.`);
      return existing;
    }
    const recognition = await prisma.recognition.create({
      data: {
        fromEmployeeId: input.fromEmployeeId,
        toEmployeeId: input.toEmployeeId,
        category: input.category,
        message: input.message,
        points: input.points || 0,
        createdAt: daysAgo(input.daysBack),
      },
    });
    for (const r of input.reactions || []) {
      await prisma.recognitionLike.create({ data: { recognitionId: recognition.id, employeeId: r.employeeId, reactionType: r.type } });
    }
    for (const c of input.comments || []) {
      await prisma.recognitionComment.create({
        data: { recognitionId: recognition.id, employeeId: c.employeeId, body: c.body, createdAt: daysAgo(c.daysBack) },
      });
    }
    console.log(`Created recognition: ${input.fromEmployeeId} -> ${input.toEmployeeId} [${input.category}]${input.points ? ` +${input.points}pts` : ''}`);
    return recognition;
  }

  await findOrCreateRecognition({
    fromEmployeeId: companyOwner.id,
    toEmployeeId: e1.id,
    category: 'CLIENT_IMPACT',
    message: 'Stepped in on the PingFed escalation over the weekend and turned an angry client call into a great one. Huge thanks!',
    points: 50,
    daysBack: 6,
    reactions: [
      { employeeId: e0.id, type: 'FIRE' },
      { employeeId: e2.id, type: 'CLAP' },
      { employeeId: e3.id, type: 'LIKE' },
    ].filter((r) => r.employeeId !== companyOwner.id),
    comments: [{ employeeId: e2.id, body: 'Saw this happen live — completely deserved.', daysBack: 5 }],
  });

  await findOrCreateRecognition({
    fromEmployeeId: e2.id,
    toEmployeeId: e3.id,
    category: 'TEAMWORK',
    message: 'Always the first to jump in and help unblock someone else\'s ticket, even when it is not their queue.',
    points: 10,
    daysBack: 4,
    reactions: [
      { employeeId: e0.id, type: 'CLAP' },
      { employeeId: e1.id, type: 'CLAP' },
    ],
  });

  await findOrCreateRecognition({
    fromEmployeeId: e1.id,
    toEmployeeId: e0.id,
    category: 'INNOVATION',
    message: 'Built a small script that cut our weekly reporting time from two hours to ten minutes. Sharing it with the whole team now.',
    points: 100,
    daysBack: 10,
    reactions: [
      { employeeId: e2.id, type: 'FIRE' },
      { employeeId: e3.id, type: 'ROCKET' },
      { employeeId: e4.id, type: 'FIRE' },
      { employeeId: e2.id, type: 'LIKE' },
    ],
    comments: [
      { employeeId: e3.id, body: 'This saved me so much time, thank you!', daysBack: 9 },
      { employeeId: e4.id, body: 'Can you walk us through it in the next standup?', daysBack: 8 },
    ],
  });

  await findOrCreateRecognition({
    fromEmployeeId: companyOwner.id,
    toEmployeeId: e4.id,
    category: 'LEADERSHIP',
    message: 'Ran point on onboarding two new hires this month and both are already contributing confidently. Great mentorship.',
    points: 25,
    daysBack: 15,
    reactions: [{ employeeId: e1.id, type: 'CLAP' }],
  });

  await findOrCreateRecognition({
    fromEmployeeId: e3.id,
    toEmployeeId: e2.id,
    category: 'GOING_ABOVE_AND_BEYOND',
    message: 'Noticed the client dashboard was down late on a Friday and had it fixed before anyone else even saw the alert.',
    points: 50,
    daysBack: 2,
    reactions: [
      { employeeId: e0.id, type: 'ROCKET' },
      { employeeId: e1.id, type: 'FIRE' },
      { employeeId: e4.id, type: 'LIKE' },
      { employeeId: companyOwner.id, type: 'CLAP' },
    ].filter((r, i, arr) => arr.findIndex((x) => x.employeeId === r.employeeId) === i),
  });

  await findOrCreateRecognition({
    fromEmployeeId: e0.id,
    toEmployeeId: e1.id,
    category: 'TEAMWORK',
    message: 'Paired with me for two full days to get the utilization report shipped on time. Would not have made the deadline otherwise.',
    daysBack: 20,
  });

  await findOrCreateRecognition({
    fromEmployeeId: e4.id,
    toEmployeeId: companyOwner.id,
    category: 'LEADERSHIP',
    message: 'Made time for a 1:1 during a genuinely packed week just to talk through my career growth. Meant a lot.',
    points: 10,
    daysBack: 25,
    reactions: [{ employeeId: e0.id, type: 'CLAP' }],
  });

  // --- Pulse surveys -------------------------------------------------------

  async function findOrCreateSurvey(input: {
    title: string;
    description?: string;
    status: string;
    audienceType: string;
    audienceDepartmentIds?: string[];
    closesAt?: Date;
    createdAt: Date;
    questions: { text: string; type: string }[];
    responses?: {
      employeeId: string;
      daysBack: number;
      answers: { qIndex: number; ratingValue?: number; boolValue?: boolean; textValue?: string }[];
    }[];
  }) {
    const existing = await prisma.pulseSurvey.findFirst({ where: { title: input.title } });
    if (existing) {
      console.log(`Pulse survey "${input.title}" already exists — skipping.`);
      return existing;
    }
    const survey = await prisma.pulseSurvey.create({
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        audienceType: input.audienceType,
        closesAt: input.closesAt,
        createdById: anyUser!.id,
        createdAt: input.createdAt,
      },
    });
    for (const deptId of input.audienceDepartmentIds || []) {
      await prisma.pulseSurveyDepartment.create({ data: { surveyId: survey.id, departmentId: deptId } });
    }
    const createdQuestions: Awaited<ReturnType<typeof prisma.pulseSurveyQuestion.create>>[] = [];
    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i];
      const question = await prisma.pulseSurveyQuestion.create({
        data: { surveyId: survey.id, text: q.text, type: q.type, order: i },
      });
      createdQuestions.push(question);
    }
    for (const r of input.responses || []) {
      const response = await prisma.pulseSurveyResponse.create({
        data: { surveyId: survey.id, employeeId: r.employeeId, submittedAt: daysAgo(r.daysBack) },
      });
      for (const a of r.answers) {
        const question = createdQuestions[a.qIndex];
        if (!question) continue;
        await prisma.pulseSurveyAnswer.create({
          data: {
            responseId: response.id,
            questionId: question.id,
            ratingValue: a.ratingValue,
            boolValue: a.boolValue,
            textValue: a.textValue,
          },
        });
      }
    }
    console.log(`Created pulse survey: ${input.title} (${input.status}) with ${input.responses?.length || 0} response(s)`);
    return survey;
  }

  // 1. ACTIVE survey, company-wide, mixed question types, a few responses in
  //    (recent, so it feeds the current month of the eNPS trend).
  await findOrCreateSurvey({
    title: 'September Team Pulse Check',
    description: 'A quick monthly check-in on workload, morale, and whether you have what you need to do your best work.',
    status: 'ACTIVE',
    audienceType: 'ALL',
    closesAt: daysFromNow(10),
    createdAt: daysAgo(4),
    questions: [
      { text: 'How manageable does your current workload feel?', type: 'RATING' },
      { text: 'Do you feel recognized for the work you do?', type: 'YES_NO' },
      { text: 'Anything you would change about how our team works right now?', type: 'TEXT' },
    ],
    responses: [
      {
        employeeId: e0.id,
        daysBack: 3,
        answers: [
          { qIndex: 0, ratingValue: 4 },
          { qIndex: 1, boolValue: true },
          { qIndex: 2, textValue: 'Would love more heads-up before scope changes land mid-sprint.' },
        ],
      },
      {
        employeeId: e1.id,
        daysBack: 2,
        answers: [
          { qIndex: 0, ratingValue: 5 },
          { qIndex: 1, boolValue: true },
          { qIndex: 2, textValue: 'Really appreciate how supportive the team has been this quarter.' },
        ],
      },
      {
        employeeId: e2.id,
        daysBack: 1,
        answers: [
          { qIndex: 0, ratingValue: 2 },
          { qIndex: 1, boolValue: false },
          { qIndex: 2, textValue: 'Workload has been heavy the last two sprints — could use another pair of hands on PingFed.' },
        ],
      },
    ],
  });

  // 2. CLOSED survey, DevOps-only, fully answered a month ago, so Results
  //    has rich data and the eNPS trend gets a second data point.
  const devopsEmployees = devopsDept
    ? await prisma.employee.findMany({ where: { departmentId: devopsDept.id }, orderBy: { createdAt: 'asc' } })
    : [];
  const closedRespondents = (devopsEmployees.length >= 2 ? devopsEmployees : employees).slice(0, 4);

  await findOrCreateSurvey({
    title: 'DevOps On-Call Experience Survey',
    description: 'Feedback on the new on-call rotation, now that it has been live for a full quarter.',
    status: 'CLOSED',
    audienceType: devopsDept ? 'DEPARTMENTS' : 'ALL',
    audienceDepartmentIds: devopsDept ? [devopsDept.id] : undefined,
    closesAt: daysAgo(32),
    createdAt: daysAgo(35),
    questions: [
      { text: 'How would you rate the current on-call rotation?', type: 'RATING' },
      { text: 'Do you feel adequately supported during an on-call incident?', type: 'YES_NO' },
      { text: 'What is the biggest friction point with on-call right now?', type: 'TEXT' },
    ],
    responses: closedRespondents.map((emp, i) => ({
      employeeId: emp.id,
      daysBack: 33 - i,
      answers: [
        { qIndex: 0, ratingValue: [5, 4, 2, 4][i % 4] },
        { qIndex: 1, boolValue: i % 4 !== 2 },
        {
          qIndex: 2,
          textValue: [
            'Rotation is fair and the team has been great about swapping shifts when needed.',
            'No complaints — documentation has gotten a lot better this quarter.',
            'Escalation alerts are still manual in a couple of cases and it has been frustrating during a live incident.',
            'Handoff between shifts sometimes loses context, which causes confusion the next morning.',
          ][i % 4],
        },
      ],
    })),
  });

  // 3. CLOSED survey from two months back — gives the eNPS trend a third
  //    point and a slightly lower score, so the sparkline shows real movement.
  await findOrCreateSurvey({
    title: 'Q2 Team Wellbeing Survey',
    description: 'A broader check-in on burnout risk and support heading into the busy season.',
    status: 'CLOSED',
    audienceType: 'ALL',
    closesAt: daysAgo(63),
    createdAt: daysAgo(66),
    questions: [
      { text: 'Overall, how supported do you feel at work right now?', type: 'RATING' },
      { text: 'Have you felt overwhelmed by your workload in the past month?', type: 'YES_NO' },
      { text: 'What would help most right now?', type: 'TEXT' },
    ],
    responses: [e0, e1, e2, e3, e4].map((emp, i) => ({
      employeeId: emp.id,
      daysBack: 64 - i,
      answers: [
        { qIndex: 0, ratingValue: [3, 4, 1, 3, 5][i % 5] },
        { qIndex: 1, boolValue: i % 5 === 2 || i % 5 === 3 },
        {
          qIndex: 2,
          textValue: [
            'Clearer priorities when scope changes mid-sprint would help a lot.',
            'Things feel good overall, appreciate the flexibility on hours.',
            'Been feeling pretty burnt out with the client escalations lately — could use backup.',
            'Workload has been a lot, an extra hire on the project would really help.',
            'No concerns — this has been a smooth few weeks.',
          ][i % 5],
        },
      ],
    })),
  });

  console.log('Employee Engagement & Feedback mock data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
