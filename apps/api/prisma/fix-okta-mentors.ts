// One-off correction for the recreated Okta project (client: Naveed).
// When it was rebuilt, the New Project drawer's Leadership picks (Raj
// Kumar / Sanjay Saraf) ended up pointing at different people than the
// two who were actually added to the team via Add Mentors (Pranav
// Sawarkar / Om Bhamre, added without picking a Leadership Role) -- a
// real mismatch between the drawer pick and the real team, not a bug in
// the sync logic (the sync only auto-tags when the SAME person appears in
// both places). Confirmed with the user: Pranav & Om are the actual
// mentors for this project. This script:
//   1. Tags Pranav's open assignment as PRIMARY and Om's as SECONDARY.
//   2. Updates Project.primaryMentorId/secondaryMentorId to match them,
//      replacing the stale Raj Kumar / Sanjay Saraf picks.
//
// Safe to re-run -- it only acts if the current state still matches what
// was found (Okta project's assignments untagged, leadership pointing at
// the old pair); if you've since changed any of this by hand in the app,
// it does nothing rather than overwrite your change.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OKTA_PROJECT_ID = '291b444a-ec02-44b1-823b-cb29fdf19b16';
const PRANAV_EMPLOYEE_ID = '1af06cc8-ffb7-4361-ae8a-f1536431205c'; // Pranav Sawarkar -> Primary
const OM_EMPLOYEE_ID = '37a7fde6-5892-46da-bd28-1df540b9b24f'; // Om Bhamre -> Secondary
const STALE_PRIMARY_ID = '4421f0a7-430a-4e85-bd51-8d97dd0fc06b'; // Raj Kumar (old, wrong pick)
const STALE_SECONDARY_ID = '1d58ef7d-9013-4e4d-9648-de94c7822116'; // Sanjay Saraf (old, wrong pick)

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: OKTA_PROJECT_ID },
    include: { assignments: { where: { endDate: null } } },
  });
  if (!project) {
    console.log('Okta project not found by id -- it may have been deleted/recreated again. Nothing done.');
    return;
  }
  if (project.name !== 'Okta') {
    console.log(`Project ${OKTA_PROJECT_ID} is now named "${project.name}", not "Okta" -- looks recreated again. Nothing done.`);
    return;
  }

  const pranavAssignment = project.assignments.find((a) => a.employeeId === PRANAV_EMPLOYEE_ID);
  const omAssignment = project.assignments.find((a) => a.employeeId === OM_EMPLOYEE_ID);

  if (pranavAssignment && !pranavAssignment.mentorRole) {
    await prisma.projectAssignment.update({ where: { id: pranavAssignment.id }, data: { mentorRole: 'PRIMARY' } });
    console.log('Tagged Pranav Sawarkar\'s assignment as PRIMARY.');
  } else if (pranavAssignment) {
    console.log(`Pranav Sawarkar's assignment is already tagged ${pranavAssignment.mentorRole} -- leaving as-is.`);
  } else {
    console.log('Pranav Sawarkar has no open assignment on this project -- skipping his tag.');
  }

  if (omAssignment && !omAssignment.mentorRole) {
    await prisma.projectAssignment.update({ where: { id: omAssignment.id }, data: { mentorRole: 'SECONDARY' } });
    console.log('Tagged Om Bhamre\'s assignment as SECONDARY.');
  } else if (omAssignment) {
    console.log(`Om Bhamre's assignment is already tagged ${omAssignment.mentorRole} -- leaving as-is.`);
  } else {
    console.log('Om Bhamre has no open assignment on this project -- skipping his tag.');
  }

  const data: { primaryMentorId?: string; secondaryMentorId?: string } = {};
  if (project.primaryMentorId === STALE_PRIMARY_ID) data.primaryMentorId = PRANAV_EMPLOYEE_ID;
  if (project.secondaryMentorId === STALE_SECONDARY_ID) data.secondaryMentorId = OM_EMPLOYEE_ID;
  if (Object.keys(data).length) {
    await prisma.project.update({ where: { id: OKTA_PROJECT_ID }, data });
    console.log('Updated project Leadership fields to Pranav Sawarkar / Om Bhamre.');
  } else {
    console.log('Project Leadership fields no longer match the stale pair -- leaving as-is.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
