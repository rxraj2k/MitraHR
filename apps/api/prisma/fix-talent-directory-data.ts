// One-off data-consistency fix for the Sprint 19 Talent Directory redesign.
// Run separately from the main seed.ts via:
//   npx ts-node prisma/fix-talent-directory-data.ts
//
// Two independent, idempotent fixes (safe to re-run any number of times):
//
// 1. Backfill deploymentStatus for anyone already staffed on a client.
//    experienceLevel/deploymentStatus were added by the Sprint 19 migration
//    with defaults of MID/BENCH for every existing row — including people
//    who already had an open (current) ProjectAssignment at the time, like
//    Pranav Sawarkar and Raj Kumar on PingFed. This flips deploymentStatus
//    to BILLABLE for any employee who is still at the untouched BENCH
//    default AND has at least one open ProjectAssignment right now. It's
//    a one-time backfill, not a standing rule — deploymentStatus stays
//    staff-editable afterward (e.g. to mark someone Shadow instead).
//
// 2. Give Prathamesh Kolte (AI Engineer, AI Engineering dept, currently no
//    skills logged at all) a starting skill set so the Talent Directory's
//    tech-stack chips have something real to show instead of "No skills
//    logged". Skills are upserted first in case this runs before the main
//    seed.ts (which is where these AI Engineering skills were added).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillDeploymentStatus() {
  const candidates = await prisma.employee.findMany({
    where: { deploymentStatus: 'BENCH', projectAssignments: { some: { endDate: null } } },
    select: { id: true, fullName: true },
  });
  for (const emp of candidates) {
    await prisma.employee.update({ where: { id: emp.id }, data: { deploymentStatus: 'BILLABLE' } });
    console.log(`  ${emp.fullName}: Bench -> Billable (has an open project assignment)`);
  }
  if (candidates.length === 0) console.log('  Nothing to backfill — no Bench employee has an open assignment.');
}

async function seedKolteSkills() {
  const kolte = await prisma.employee.findFirst({ where: { fullName: 'Prathamesh Kolte' } });
  if (!kolte) {
    console.log('  Prathamesh Kolte not found — skipping.');
    return;
  }
  const existingCount = await prisma.employeeSkill.count({ where: { employeeId: kolte.id } });
  if (existingCount > 0) {
    console.log(`  Prathamesh Kolte already has ${existingCount} skill(s) logged — leaving as-is.`);
    return;
  }
  const skillSet: { name: string; proficiency: string; yearsExperience: number }[] = [
    { name: 'Python (AI/ML)', proficiency: 'EXPERT', yearsExperience: 5 },
    { name: 'Machine Learning', proficiency: 'ADVANCED', yearsExperience: 4 },
    { name: 'PyTorch', proficiency: 'ADVANCED', yearsExperience: 3 },
    { name: 'LangChain', proficiency: 'INTERMEDIATE', yearsExperience: 1.5 },
  ];
  for (const s of skillSet) {
    const skill = await prisma.skill.upsert({ where: { name: s.name }, update: {}, create: { name: s.name } });
    await prisma.employeeSkill.upsert({
      where: { employeeId_skillId: { employeeId: kolte.id, skillId: skill.id } },
      update: { proficiency: s.proficiency, yearsExperience: s.yearsExperience },
      create: {
        employeeId: kolte.id,
        skillId: skill.id,
        proficiency: s.proficiency,
        yearsExperience: s.yearsExperience,
      },
    });
  }
  console.log(`  Prathamesh Kolte: added ${skillSet.map((s) => s.name).join(', ')}`);
}

async function main() {
  console.log('Backfilling deploymentStatus for already-staffed employees...');
  await backfillDeploymentStatus();
  console.log('Seeding starting skills for Prathamesh Kolte...');
  await seedKolteSkills();
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
