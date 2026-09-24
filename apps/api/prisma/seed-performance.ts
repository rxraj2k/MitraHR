// Standalone mock-data seed for the redesigned Performance & Goals module
// (OKR alignment tree + 360-degree review matrix + 9-box grid + check-in
// timeline). Run separately from the main seed.ts, same pattern as
// seed-recruitment.ts:
//   npx ts-node prisma/seed-performance.ts
//
// Safe to re-run: the review cycle is looked up by name, goals by
// (employeeId, title), and reviews by (employeeId, reviewCycleId) before
// creating, so running it twice won't create duplicates. Key results,
// check-ins and review feedback are only added the first time their parent
// row is created.
//
// Links to real Department / Project / Employee records already in this
// database rather than inventing orphaned IDs — same precedent as
// seed-recruitment.ts.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function main() {
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: 'asc' }, take: 12 });
  if (employees.length === 0) {
    console.log('No employees found in the database — run the main seed first. Skipping performance seed.');
    return;
  }

  const devopsDept = await prisma.department.findFirst({ where: { name: 'DevOps' } });
  const pingFedProject = await prisma.project.findFirst({ where: { name: 'PingFed' } });
  const sanjay = await prisma.employee.findFirst({ where: { fullName: 'Sanjay Saraf' } });
  const admin = await prisma.employee.findFirst({ where: { systemRole: 'ADMINISTRATOR' }, orderBy: { createdAt: 'asc' } });

  const devopsEmployees = devopsDept
    ? await prisma.employee.findMany({ where: { departmentId: devopsDept.id }, orderBy: { createdAt: 'asc' } })
    : [];

  const companyOwner = admin || sanjay || employees[0];
  const deptOwner = sanjay || devopsEmployees[0] || employees[0];
  const individualOwner =
    devopsEmployees.find((e) => e.id !== deptOwner.id) ||
    employees.find((e) => e.id !== deptOwner.id) ||
    employees[0];

  // --- Review Cycle: Q3 2026 Engineering & Ops Review, ACTIVE, mid-cycle ---
  let cycle = await prisma.reviewCycle.findFirst({ where: { name: 'Q3 2026 Engineering & Ops Review' } });
  if (!cycle) {
    cycle = await prisma.reviewCycle.create({
      data: {
        name: 'Q3 2026 Engineering & Ops Review',
        startDate: daysAgo(45),
        endDate: daysFromNow(45),
        status: 'ACTIVE',
      },
    });
    console.log(`Created review cycle: ${cycle.name}`);
  } else {
    console.log('Review cycle already exists — skipping.');
  }

  // --- 3 OKR goals: Company -> Department -> Individual alignment chain ---

  async function findOrCreateGoal(input: {
    employeeId: string;
    title: string;
    description: string;
    category: 'COMPANY' | 'TEAM' | 'INDIVIDUAL';
    parentGoalId?: string;
    projectId?: string;
    progress: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED';
    dueDate: Date;
    keyResults: { title: string; targetValue?: string; completed: boolean }[];
    checkIns?: { progressUpdate: string; blockers?: string; confidence: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'; daysBack: number }[];
  }) {
    const existing = await prisma.goal.findFirst({ where: { employeeId: input.employeeId, title: input.title } });
    if (existing) {
      console.log(`Goal "${input.title}" already exists — skipping.`);
      return existing;
    }
    const goal = await prisma.goal.create({
      data: {
        employeeId: input.employeeId,
        reviewCycleId: cycle!.id,
        parentGoalId: input.parentGoalId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        category: input.category,
        progress: input.progress,
        status: input.status,
        dueDate: input.dueDate,
      },
    });
    for (let i = 0; i < input.keyResults.length; i++) {
      const kr = input.keyResults[i];
      await prisma.keyResult.create({
        data: {
          goalId: goal.id,
          title: kr.title,
          targetValue: kr.targetValue,
          completed: kr.completed,
          order: i,
        },
      });
    }
    for (const ci of input.checkIns || []) {
      await prisma.checkIn.create({
        data: {
          employeeId: input.employeeId,
          goalId: goal.id,
          progressUpdate: ci.progressUpdate,
          blockers: ci.blockers,
          confidence: ci.confidence,
          checkInDate: daysAgo(ci.daysBack),
        },
      });
    }
    console.log(`Created goal: [${input.category}] ${input.title}`);
    return goal;
  }

  const companyGoal = await findOrCreateGoal({
    employeeId: companyOwner.id,
    title: 'Increase US Client Retention',
    description: 'Strengthen relationships with existing US client engagements and reduce churn heading into renewal season.',
    category: 'COMPANY',
    progress: 55,
    status: 'IN_PROGRESS',
    dueDate: daysFromNow(45),
    keyResults: [
      { title: 'Renew 3 major US client contracts', targetValue: '3 contracts', completed: false },
      { title: 'Reduce client escalations', targetValue: '30% reduction', completed: false },
      { title: 'Launch quarterly client health surveys', completed: true },
    ],
  });

  const departmentGoal = await findOrCreateGoal({
    employeeId: deptOwner.id,
    title: 'Maintain <24h Ticket Resolution',
    description: 'Keep support and infra ticket turnaround under 24 hours across all active client engagements.',
    category: 'TEAM',
    parentGoalId: companyGoal.id,
    projectId: pingFedProject?.id,
    progress: 65,
    status: 'IN_PROGRESS',
    dueDate: daysFromNow(30),
    keyResults: [
      { title: 'Reduce average resolution time', targetValue: '<24h', completed: false },
      { title: 'Stand up an on-call rotation', completed: true },
      { title: 'Set up automated escalation alerts', completed: false },
    ],
    checkIns: [
      {
        progressUpdate: 'On-call rotation is live across the team. Average resolution time down to ~29h.',
        confidence: 'ON_TRACK',
        daysBack: 12,
      },
      {
        progressUpdate: 'Escalation alerting still pending — blocked on monitoring vendor access.',
        blockers: 'Waiting on client to approve monitoring tool access.',
        confidence: 'AT_RISK',
        daysBack: 3,
      },
    ],
  });

  await findOrCreateGoal({
    employeeId: individualOwner.id,
    title: 'Complete AWS Certification',
    description: 'Get AWS Solutions Architect Associate certified to support the DevOps team\'s cloud engagements.',
    category: 'INDIVIDUAL',
    parentGoalId: departmentGoal.id,
    projectId: pingFedProject?.id,
    progress: 40,
    status: 'IN_PROGRESS',
    dueDate: daysFromNow(60),
    keyResults: [
      { title: 'Complete AWS certification coursework', completed: true },
      { title: 'Pass AWS Solutions Architect Associate exam', targetValue: 'Pass by Oct 2026', completed: false },
    ],
    checkIns: [
      {
        progressUpdate: 'Finished the coursework modules on VPC and IAM. Starting practice exams next week.',
        confidence: 'ON_TRACK',
        daysBack: 8,
      },
    ],
  });

  // --- 4 performance reviews spread across 360-completion states ----------

  const reviewees = [individualOwner, deptOwner, companyOwner, employees.find((e) => e.id !== individualOwner.id && e.id !== deptOwner.id && e.id !== companyOwner.id) || employees[employees.length - 1]];
  const managerRater = companyOwner;
  const peerRaterA = deptOwner;
  const peerRaterB = employees.find((e) => e.id !== reviewees[1]?.id) || employees[0];

  async function findOrCreateReview(input: {
    employee: (typeof employees)[number];
    expectedPeerReviewers: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    overallRating?: number;
    potentialRating?: number;
    managerSummary?: string;
    employeeAcknowledged?: boolean;
    feedback: {
      raterId: string;
      raterType: 'SELF' | 'MANAGER' | 'PEER' | 'CLIENT';
      technicalRating?: number;
      communicationRating?: number;
      teamworkRating?: number;
      goalAchievementRating?: number;
      comments?: string;
    }[];
  }) {
    const existing = await prisma.performanceReview.findFirst({
      where: { employeeId: input.employee.id, reviewCycleId: cycle!.id },
    });
    if (existing) {
      console.log(`Performance review for ${input.employee.fullName} already exists — skipping.`);
      return existing;
    }
    const review = await prisma.performanceReview.create({
      data: {
        reviewCycleId: cycle!.id,
        employeeId: input.employee.id,
        expectedPeerReviewers: input.expectedPeerReviewers,
        status: input.status,
        overallRating: input.overallRating,
        potentialRating: input.potentialRating,
        managerSummary: input.managerSummary,
        employeeAcknowledged: input.employeeAcknowledged || false,
        acknowledgedAt: input.employeeAcknowledged ? daysAgo(1) : undefined,
      },
    });
    for (const f of input.feedback) {
      await prisma.reviewFeedback.create({
        data: {
          performanceReviewId: review.id,
          raterId: f.raterId,
          raterType: f.raterType,
          technicalRating: f.technicalRating,
          communicationRating: f.communicationRating,
          teamworkRating: f.teamworkRating,
          goalAchievementRating: f.goalAchievementRating,
          comments: f.comments,
        },
      });
    }
    console.log(`Created performance review for ${input.employee.fullName} (${input.status})`);
    return review;
  }

  // 1. Only self-review submitted.
  await findOrCreateReview({
    employee: reviewees[0],
    expectedPeerReviewers: 3,
    status: 'IN_PROGRESS',
    feedback: [
      {
        raterId: reviewees[0].id,
        raterType: 'SELF',
        technicalRating: 4,
        communicationRating: 3,
        teamworkRating: 4,
        goalAchievementRating: 3,
        comments: 'Made good progress on the AWS certification and stayed on top of my assigned tickets this cycle.',
      },
    ],
  });

  // 2. Self + partial peer (1 of 3).
  await findOrCreateReview({
    employee: reviewees[1],
    expectedPeerReviewers: 3,
    status: 'IN_PROGRESS',
    feedback: [
      {
        raterId: reviewees[1].id,
        raterType: 'SELF',
        technicalRating: 5,
        communicationRating: 4,
        teamworkRating: 4,
        goalAchievementRating: 4,
        comments: 'Led the on-call rotation rollout and kept resolution times trending down.',
      },
      {
        raterId: peerRaterB.id,
        raterType: 'PEER',
        technicalRating: 4,
        communicationRating: 4,
        teamworkRating: 5,
        goalAchievementRating: 4,
        comments: 'Always responsive when I need infra help. Great to work with.',
      },
    ],
  });

  // 3. Self + peers complete + manager in draft (no finalize yet).
  await findOrCreateReview({
    employee: reviewees[2],
    expectedPeerReviewers: 2,
    status: 'IN_PROGRESS',
    feedback: [
      {
        raterId: reviewees[2].id,
        raterType: 'SELF',
        technicalRating: 4,
        communicationRating: 5,
        teamworkRating: 4,
        goalAchievementRating: 4,
        comments: 'Focused this cycle on client retention initiatives and the quarterly health survey rollout.',
      },
      {
        raterId: peerRaterA.id,
        raterType: 'PEER',
        technicalRating: 4,
        communicationRating: 5,
        teamworkRating: 4,
        goalAchievementRating: 4,
        comments: 'Great cross-team communicator, keeps everyone aligned on client priorities.',
      },
      {
        raterId: peerRaterB.id,
        raterType: 'PEER',
        technicalRating: 5,
        communicationRating: 5,
        teamworkRating: 5,
        goalAchievementRating: 4,
        comments: 'One of the most reliable people to loop in on a client escalation.',
      },
      {
        raterId: managerRater.id,
        raterType: 'MANAGER',
        technicalRating: 4,
        communicationRating: 5,
        teamworkRating: 4,
        goalAchievementRating: 4,
        comments: 'Draft notes: strong quarter, still finalizing the growth-potential conversation before signing off.',
      },
    ],
  });

  // 4. Fully finalized — self + peer + manager + client, rated and acknowledged.
  await findOrCreateReview({
    employee: reviewees[3],
    expectedPeerReviewers: 2,
    status: 'COMPLETED',
    overallRating: 5,
    potentialRating: 4,
    managerSummary:
      'Outstanding quarter — consistently exceeded expectations on client-facing delivery and mentored two junior engineers. Strong candidate for expanded scope next cycle.',
    employeeAcknowledged: true,
    feedback: [
      {
        raterId: reviewees[3].id,
        raterType: 'SELF',
        technicalRating: 4,
        communicationRating: 4,
        teamworkRating: 5,
        goalAchievementRating: 5,
        comments: 'Proud of how the team handled the PingFed rollout this quarter.',
      },
      {
        raterId: peerRaterA.id,
        raterType: 'PEER',
        technicalRating: 5,
        communicationRating: 4,
        teamworkRating: 5,
        goalAchievementRating: 5,
        comments: 'Sets the bar for the rest of the team. Always willing to jump in.',
      },
      {
        raterId: peerRaterB.id,
        raterType: 'PEER',
        technicalRating: 5,
        communicationRating: 5,
        teamworkRating: 5,
        goalAchievementRating: 5,
        comments: 'Best technical mentor I have worked with here.',
      },
      {
        raterId: managerRater.id,
        raterType: 'MANAGER',
        technicalRating: 5,
        communicationRating: 5,
        teamworkRating: 5,
        goalAchievementRating: 5,
        comments: 'Ready for more scope. Recommending for the next promotion cycle.',
      },
      {
        raterId: managerRater.id,
        raterType: 'CLIENT',
        technicalRating: 5,
        communicationRating: 5,
        teamworkRating: 5,
        goalAchievementRating: 5,
        comments: 'The client explicitly called this person out as the reason the engagement has gone so smoothly.',
      },
    ],
  });

  console.log('Performance & Goals mock data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
