// One-off data-carry for the Leadership <-> Mentors (Allocation) unification.
// Every project so far had its Primary/Secondary mentor picked in the
// project drawer (Project.primaryMentorId/secondaryMentorId) and the same
// people added to the team separately (ProjectAssignment), but the
// assignment rows predate the mentorRole column, so they were never tagged
// PRIMARY/SECONDARY -- which is why the Mentors (Allocation) section on the
// Project Management screen was showing "Not assigned" even though the
// mentor is plainly on the team.
//
// Run once after `npx prisma migrate dev`:
//   npx ts-node prisma/fix-project-mentors.ts
//
// Idempotent (safe to re-run): only tags an OPEN assignment
// (endDate: null) whose employeeId matches the project's primary/secondary
// mentor AND that doesn't already carry a mentorRole -- never overwrites a
// deliberate PRIMARY/SECONDARY/plain-member tag someone already set via
// Add Mentors.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { OR: [{ primaryMentorId: { not: null } }, { secondaryMentorId: { not: null } }] },
    include: { assignments: { where: { endDate: null } } },
  });

  if (projects.length === 0) {
    console.log('No projects with a primary/secondary mentor set -- nothing to backfill.');
    return;
  }

  for (const p of projects) {
    const jobs: [string, 'PRIMARY' | 'SECONDARY'][] = [];
    if (p.primaryMentorId) jobs.push([p.primaryMentorId, 'PRIMARY']);
    if (p.secondaryMentorId) jobs.push([p.secondaryMentorId, 'SECONDARY']);

    for (const [employeeId, role] of jobs) {
      const match = p.assignments.find((a) => a.employeeId === employeeId);
      if (!match) {
        console.log(`  ${p.name}: ${role} mentor is not an open team assignment -- leaving as-is.`);
        continue;
      }
      if (match.mentorRole) {
        console.log(`  ${p.name}: ${role} mentor's assignment is already tagged ${match.mentorRole} -- leaving as-is.`);
        continue;
      }
      await prisma.projectAssignment.update({ where: { id: match.id }, data: { mentorRole: role } });
      console.log(`  ${p.name}: tagged existing assignment as ${role} mentor.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
