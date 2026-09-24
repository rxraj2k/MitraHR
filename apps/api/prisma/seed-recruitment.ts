// Standalone mock-data seed for the redesigned Recruitment / ATS module.
// Run separately from the main seed.ts (which never deletes rows) via:
//   npx ts-node prisma/seed-recruitment.ts
// Safe to re-run: each job opening is looked up by title first and skipped
// if it already exists, so running it twice won't create duplicates.
//
// Links to real Department / Project / Employee / Technology records
// already in this database rather than inventing orphaned IDs — this repo
// only has IAM/DevOps/security-consulting clients & tech tags on hand, so
// this data is realistic given what actually exists here, not necessarily
// a literal match to a generic "React/Python" software shop.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nextJobOpeningRefCode(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name: 'jobOpeningRefCode' },
    update: { value: { increment: 1 } },
    create: { name: 'jobOpeningRefCode', value: 1 },
  });
  return `REC-${String(counter.value).padStart(4, '0')}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function findTechIds(names: string[]): Promise<string[]> {
  const rows = await prisma.technology.findMany({ where: { name: { in: names } }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function main() {
  const devopsDept = await prisma.department.findFirst({ where: { name: 'DevOps' } });
  const aiEngDept = await prisma.department.findFirst({ where: { name: 'AI Engineering' } });
  const pingFedProject = await prisma.project.findFirst({ where: { name: 'PingFed' } });
  const sanjay = await prisma.employee.findFirst({ where: { fullName: 'Sanjay Saraf' } });
  const prathamesh = await prisma.employee.findFirst({ where: { fullName: 'Prathamesh Kolte' } });

  const devopsTechIds = await findTechIds(['AWS', 'Kubernetes', 'Terraform', 'Docker']);
  const fullStackTechIds = await findTechIds(['AWS', 'Docker', 'GitHub Actions']);

  // --- Job Opening 1: Senior DevOps Engineer -----------------------------
  let devopsOpening = await prisma.jobOpening.findFirst({ where: { title: 'Senior DevOps Engineer' } });
  if (!devopsOpening) {
    devopsOpening = await prisma.jobOpening.create({
      data: {
        refCode: await nextJobOpeningRefCode(),
        title: 'Senior DevOps Engineer',
        departmentId: devopsDept?.id,
        projectId: pingFedProject?.id,
        hiringManagerId: sanjay?.id,
        technologies: devopsTechIds.length > 0 ? { connect: devopsTechIds.map((id) => ({ id })) } : undefined,
        employmentType: 'FULL_TIME',
        experienceLevel: 'SENIOR',
        salaryRange: '$110,000 – $140,000 / year',
        headcountTarget: 3,
        description:
          'Own CI/CD pipelines and cloud infrastructure (AWS, Kubernetes, Terraform) for our US client engagements. Senior-level, client-facing role — will work directly with the client team.',
        status: 'OPEN',
      },
    });
    console.log(`Created job opening: ${devopsOpening.refCode} — Senior DevOps Engineer`);
  } else {
    console.log('Senior DevOps Engineer opening already exists — skipping.');
  }

  // --- Job Opening 2: Full-Stack Developer -------------------------------
  let fullStackOpening = await prisma.jobOpening.findFirst({ where: { title: 'Full-Stack Developer' } });
  if (!fullStackOpening) {
    fullStackOpening = await prisma.jobOpening.create({
      data: {
        refCode: await nextJobOpeningRefCode(),
        title: 'Full-Stack Developer',
        departmentId: aiEngDept?.id,
        hiringManagerId: prathamesh?.id,
        technologies: fullStackTechIds.length > 0 ? { connect: fullStackTechIds.map((id) => ({ id })) } : undefined,
        employmentType: 'CONTRACTOR',
        experienceLevel: 'MID',
        salaryRange: '$75 – $95 / hr (Contract)',
        headcountTarget: 2,
        description:
          'Build and maintain internal tooling and client-facing web apps. Contract engagement with strong potential for extension.',
        status: 'OPEN',
      },
    });
    console.log(`Created job opening: ${fullStackOpening.refCode} — Full-Stack Developer`);
  } else {
    console.log('Full-Stack Developer opening already exists — skipping.');
  }

  // --- Candidates, spread across the pipeline ----------------------------
  const candidateSeeds = [
    {
      jobOpeningId: devopsOpening.id,
      fullName: 'Ananya Deshpande',
      email: 'ananya.deshpande@example.com',
      phone: '+91 98200 11223',
      source: 'LINKEDIN' as const,
      stage: 'APPLIED' as const,
      appliedAt: daysAgo(2),
    },
    {
      jobOpeningId: devopsOpening.id,
      fullName: 'Rohit Malhotra',
      email: 'rohit.malhotra@example.com',
      phone: '+91 98670 44556',
      source: 'REFERRAL' as const,
      stage: 'SCREENING_CALL' as const,
      appliedAt: daysAgo(6),
      screeningNotes: 'Strong AWS/Terraform background, 6 yrs experience. Good communication on the intro call.',
      screeningRating: 4,
    },
    {
      jobOpeningId: devopsOpening.id,
      fullName: 'Karan Mehta',
      email: 'karan.mehta@example.com',
      phone: '+91 99870 33445',
      source: 'NAUKRI' as const,
      stage: 'TECHNICAL_ROUND' as const,
      appliedAt: daysAgo(10),
      screeningNotes: 'Confident, articulate. Cleared for technical round.',
      screeningRating: 5,
      technicalNotes: 'Solid on Kubernetes and CI/CD design questions. Scheduling client round.',
      technicalRating: 4,
      nextInterviewAt: daysFromNow(3),
    },
    {
      jobOpeningId: fullStackOpening.id,
      fullName: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '+91 90040 77889',
      source: 'LINKEDIN' as const,
      stage: 'FINAL_ROUND' as const,
      appliedAt: daysAgo(14),
      screeningNotes: 'Great portfolio, prior contract experience with US clients.',
      screeningRating: 4,
      technicalNotes: 'Clean code, good debugging approach in the live exercise.',
      technicalRating: 5,
      nextInterviewAt: daysFromNow(2),
    },
    {
      jobOpeningId: fullStackOpening.id,
      fullName: 'Vikram Iyer',
      email: 'vikram.iyer@example.com',
      phone: '+91 98220 66778',
      source: 'REFERRAL' as const,
      stage: 'OFFER_EXTENDED' as const,
      appliedAt: daysAgo(20),
      screeningNotes: 'Referred by an existing contractor. Very strong fit.',
      screeningRating: 5,
      technicalNotes: 'Excellent — best technical round of this batch.',
      technicalRating: 5,
      finalRoundNotes: 'Client loved him. Verbal offer extended, awaiting written acceptance.',
      finalRoundRating: 5,
    },
  ];

  for (const seed of candidateSeeds) {
    const existing = await prisma.candidate.findFirst({
      where: { jobOpeningId: seed.jobOpeningId, email: seed.email },
    });
    if (existing) {
      console.log(`Candidate ${seed.fullName} already exists — skipping.`);
      continue;
    }
    await prisma.candidate.create({ data: seed });
    console.log(`Created candidate: ${seed.fullName} (${seed.stage})`);
  }

  console.log('Recruitment mock data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
