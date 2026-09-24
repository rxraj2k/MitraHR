// One-off data-carry for the Project Management multi-select tech stack
// upgrade. Run separately after `npx prisma migrate dev` picks up the new
// `Project.technologies` m2m relation:
//   npx ts-node prisma/fix-project-technologies.ts
//
// Idempotent (safe to re-run): connects each project's legacy single
// `technologyId` into the new `technologies` tag list, but only for
// projects that don't already have any tags — never overwrites a tag set
// someone has already edited by hand through the new UI. The legacy
// `technologyId` column itself is left untouched (still there for
// reference), the UI just stops writing to it going forward.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    where: { technologyId: { not: null } },
    include: { technologies: { select: { id: true } }, technology: { select: { name: true } } },
  });

  if (projects.length === 0) {
    console.log('No projects with a legacy technologyId — nothing to carry over.');
    return;
  }

  for (const p of projects) {
    if (p.technologies.length > 0) {
      console.log(`  ${p.name}: already has ${p.technologies.length} tag(s) tagged — leaving as-is.`);
      continue;
    }
    await prisma.project.update({
      where: { id: p.id },
      data: { technologies: { connect: [{ id: p.technologyId! }] } },
    });
    console.log(`  ${p.name}: tagged with "${p.technology?.name}" (carried over from technologyId).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
