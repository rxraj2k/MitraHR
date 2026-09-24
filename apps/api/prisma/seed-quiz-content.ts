// Seeds Learning Center assessment content for all three tracks:
//
//   - Mandatory Training: ONE track-wide assessment (Quiz.track = 'MANDATORY',
//     Quiz.courseId = null) combining 3-4 questions per Mandatory course into
//     a single 70-question assessment. Each question's text is tagged with
//     its source course, e.g. "[Jira Tutorial] ...", purely so staff can see
//     what a question is about when editing in Manage Assessments — the
//     assessment itself is one track-wide quiz, not split by course.
//   - IAM Engineering: one assessment PER COURSE (Quiz.courseId set), 20
//     questions each, looked up by each course's exact `title`.
//   - DevOps Engineering: one assessment PER COURSE (Quiz.courseId set), 10
//     questions each, looked up by each course's exact `title`.
//
// Data lives in prisma/data/quiz-{mandatory,iam,devops}-questions.json —
// each an array of { courseTitle, questions: [{ text, options: [{ text,
// isCorrect }] }] } blocks, same shape whether authored by hand or by an
// agent. Edit those files (or add/remove courses/questions) and re-run this
// script at any time.
//
// Safe to re-run: each quiz is looked up by its unique courseId/track and
// its questions are replaced wholesale (same wholesale-replace pattern as
// QuizzesService.saveQuiz), so re-running this after editing the JSON data
// files just updates existing quizzes rather than duplicating anything.
//
// PREREQUISITE: run this only after `npx prisma migrate dev` has applied the
// 20260923150000_quiz_track_scope migration (adds Quiz.track / makes
// Quiz.courseId nullable) and regenerated the Prisma Client — otherwise
// `track` won't exist on the Quiz model yet and this script will fail to
// compile/run.
//
// Run once from apps/api:
//   npx ts-node prisma/seed-quiz-content.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SeedOption {
  text: string;
  isCorrect: boolean;
}
interface SeedQuestion {
  text: string;
  options: SeedOption[];
}
interface SeedCourseBlock {
  courseTitle: string;
  questions: SeedQuestion[];
}

function loadData(fileName: string): SeedCourseBlock[] {
  const filePath = path.join(__dirname, 'data', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validate(blocks: SeedCourseBlock[], label: string) {
  for (const block of blocks) {
    if (!block.questions.length) {
      throw new Error(`${label} / "${block.courseTitle}": has no questions`);
    }
    for (const q of block.questions) {
      if (q.options.length < 2) {
        throw new Error(`${label} / "${block.courseTitle}": question "${q.text}" needs at least 2 options`);
      }
      const correct = q.options.filter((o) => o.isCorrect);
      if (correct.length !== 1) {
        throw new Error(
          `${label} / "${block.courseTitle}": question "${q.text}" must have exactly 1 correct option (found ${correct.length})`,
        );
      }
    }
  }
}

function questionsCreateInput(questions: SeedQuestion[]) {
  return {
    create: questions.map((q, qi) => ({
      text: q.text,
      order: qi,
      options: {
        create: q.options.map((o, oi) => ({ text: o.text, isCorrect: o.isCorrect, order: oi })),
      },
    })),
  };
}

async function upsertCourseQuiz(courseId: string, title: string, questions: SeedQuestion[]): Promise<'created' | 'updated'> {
  const existing = await prisma.quiz.findUnique({ where: { courseId } });
  if (existing) {
    await prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
    await prisma.quiz.update({
      where: { id: existing.id },
      data: { title, passPercent: 70, active: true, questions: questionsCreateInput(questions) },
    });
    return 'updated';
  }
  await prisma.quiz.create({
    data: { courseId, title, passPercent: 70, active: true, questions: questionsCreateInput(questions) },
  });
  return 'created';
}

async function upsertTrackQuiz(track: string, title: string, questions: SeedQuestion[]): Promise<'created' | 'updated'> {
  const existing = await prisma.quiz.findUnique({ where: { track } });
  if (existing) {
    await prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
    await prisma.quiz.update({
      where: { id: existing.id },
      data: { title, passPercent: 70, active: true, questions: questionsCreateInput(questions) },
    });
    return 'updated';
  }
  await prisma.quiz.create({
    data: { track, title, passPercent: 70, active: true, questions: questionsCreateInput(questions) },
  });
  return 'created';
}

async function seedCourseScoped(blocks: SeedCourseBlock[], label: string) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const block of blocks) {
    const course = await prisma.trainingCourse.findUnique({ where: { title: block.courseTitle } });
    if (!course) {
      console.warn(`  SKIP (course not found in TrainingCourse): "${block.courseTitle}"`);
      skipped++;
      continue;
    }
    const result = await upsertCourseQuiz(course.id, 'Knowledge Check', block.questions);
    if (result === 'created') created++;
    else updated++;
    console.log(`  ${result}: ${block.courseTitle} (${block.questions.length} questions)`);
  }
  console.log(`${label}: ${created} created, ${updated} updated, ${skipped} skipped\n`);
}

async function seedMandatoryTrack(blocks: SeedCourseBlock[]) {
  const questions: SeedQuestion[] = [];
  for (const block of blocks) {
    for (const q of block.questions) {
      questions.push({ text: `[${block.courseTitle}] ${q.text}`, options: q.options });
    }
  }
  const result = await upsertTrackQuiz('MANDATORY', 'Mandatory Training Assessment', questions);
  console.log(
    `Mandatory Training track-wide assessment: ${result} (${questions.length} questions across ${blocks.length} courses)\n`,
  );
}

async function main() {
  const mandatory = loadData('quiz-mandatory-questions.json');
  const iam = loadData('quiz-iam-questions.json');
  const devops = loadData('quiz-devops-questions.json');

  validate(mandatory, 'Mandatory Training');
  validate(iam, 'IAM Engineering');
  validate(devops, 'DevOps Engineering');

  console.log('--- Mandatory Training (track-wide assessment) ---');
  await seedMandatoryTrack(mandatory);

  console.log('--- IAM Engineering (one assessment per course) ---');
  await seedCourseScoped(iam, 'IAM Engineering');

  console.log('--- DevOps Engineering (one assessment per course) ---');
  await seedCourseScoped(devops, 'DevOps Engineering');

  console.log('All assessment content seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
