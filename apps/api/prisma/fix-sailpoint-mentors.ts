// One-off correction for the SailPoint project (client: Naveed) — same
// root cause as the earlier Okta fix: the drawer's Leadership pick (Raj
// Kumar as Primary, Secondary left blank) and the two people actually
// added via Add Mentors (Harsh Kumar, Prathamesh Kolte — added before the
// Leadership Role field was made mandatory) didn't line up. Confirmed
// with the user: Harsh Kumar is Primary, Prathamesh Kolte is Secondary.
// This script:
//   1. Tags Harsh's open assignment as PRIMARY and Prathamesh's as
//      SECONDARY.
//   2. Updates Project.primaryMentorId/secondaryMentorId to match them,
//      replacing the stale Raj Kumar pick.
//
// Safe to re-run — only acts if the current state still matches what was
// found; if you've since changed any of this by hand in the app, it does
// nothing rather than overwrite your change.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAILPOINT_PROJECT_ID = '9dfdd4cc-353c-418b-8156-380b48ceb807';
const HARSH_EMPLOYEE_ID = 'c8e455df-4890-4502-9bd0-7100ada2e699'; // Harsh Kumar -> Primary
const PRATHAMESH_EMPLOYEE_ID = 'ddfcaf9c-a24c-47b1-ac3b-264d73b9463b'; // Prathamesh Kolte -> Secondary
const STALE_PRIMARY_ID = '4421f0a7-430a-4e85-bd51-8d97dd0fc06b'; // Raj Kumar (old, wrong pick)

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: SAILPOINT_PROJECT_ID },
    include: { assignments: { where: { endDate: null } } },
  });
  if (!project) {
    console.log('SailPoint project not found by id — it may have been deleted/recreated again. Nothing done.');
    return;
  }
  if (project.name !== 'SailPoint') {
    console.log(`Project ${SAILPOINT_PROJECT_ID} is now named "${project.name}", not "SailPoint" — looks recreated again. Nothing done.`);
    return;
  }

  const harshAssignment = project.assignments.find((a) => a.employeeId === HARSH_EMPLOYEE_ID);
  const prathameshAssignment = project.assignments.find((a) => a.employeeId === PRATHAMESH_EMPLOYEE_ID);

  if (harshAssignment && !harshAssignment.mentorRole) {
    await prisma.projectAssignment.update({ where: { id: harshAssignment.id }, data: { mentorRole: 'PRIMARY' } });
    console.log("Tagged Harsh Kumar's assignment as PRIMARY.");
  } else if (harshAssignment) {
    console.log(`Harsh Kumar's assignment is already tagged ${harshAssignment.mentorRole} — leaving as-is.`);
  } else {
    console.log('Harsh Kumar has no open assignment on this project — skipping his tag.');
  }

  if (prathameshAssignment && !prathameshAssignment.mentorRole) {
    await prisma.projectAssignment.update({ where: { id: prathameshAssignment.id }, data: { mentorRole: 'SECONDARY' } });
    console.log("Tagged Prathamesh Kolte's assignment as SECONDARY.");
  } else if (prathameshAssignment) {
    console.log(`Prathamesh Kolte's assignment is already tagged ${prathameshAssignment.mentorRole} — leaving as-is.`);
  } else {
    console.log('Prathamesh Kolte has no open assignment on this project — skipping his tag.');
  }

  const data: { primaryMentorId?: string; secondaryMentorId?: string } = {};
  if (project.primaryMentorId === STALE_PRIMARY_ID) data.primaryMentorId = HARSH_EMPLOYEE_ID;
  if (!project.secondaryMentorId) data.secondaryMentorId = PRATHAMESH_EMPLOYEE_ID;
  if (Object.keys(data).length) {
    await prisma.project.update({ where: { id: SAILPOINT_PROJECT_ID }, data });
    console.log('Updated project Leadership fields to Harsh Kumar / Prathamesh Kolte.');
  } else {
    console.log('Project Leadership fields no longer match the stale state — leaving as-is.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
