// One-time cleanup: before Mandatory Training became a single track-wide
// assessment, one demo quiz ("Phishing Awareness Knowledge Check") had been
// seeded directly on a Mandatory-category course. Now that Mandatory only
// ever has a track-wide Quiz (Quiz.track = 'MANDATORY'), that old per-course
// quiz is unreachable from any UI (Master Data > Assessments and Learning
// Center's Manage Assessments both render the single track editor for
// Mandatory, never a per-course one) — dead data, not a bug, but worth
// clearing out rather than leaving orphaned rows behind.
//
// Safe/idempotent: only deletes a course-scoped Quiz whose course sits in
// the Mandatory categories AND that has zero QuizAttempts (never touches
// anything an employee has actually taken). Running this again once the
// cleanup is done is a no-op.
//
// Run once from apps/api:
//   npx ts-node prisma/fix-remove-orphaned-mandatory-quiz.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MANDATORY_CATEGORIES = ['AGILE_TOOLS', 'MS365', 'ZOHO_TOOLS', 'SECURITY_IT', 'AI_TOOLS', 'GLOBAL_SKILLS'];

async function main() {
  const orphans = await prisma.quiz.findMany({
    where: { courseId: { not: null }, course: { category: { in: MANDATORY_CATEGORIES } } },
    include: { course: true, _count: { select: { attempts: true } } },
  });

  if (orphans.length === 0) {
    console.log('No orphaned per-course Mandatory quizzes found — nothing to do.');
    return;
  }

  for (const quiz of orphans) {
    if (quiz._count.attempts > 0) {
      console.log(`  SKIP (has ${quiz._count.attempts} attempt(s), keeping): "${quiz.title}" on "${quiz.course?.title}"`);
      continue;
    }
    await prisma.quiz.delete({ where: { id: quiz.id } });
    console.log(`  Deleted: "${quiz.title}" on "${quiz.course?.title}" (now covered by the Mandatory Training track-wide assessment)`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
