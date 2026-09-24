// Seeds the "IAM Engineering" Learning Center tab's assignable course
// catalog (Udemy + CloudFoundation + SecApps course links) — run once from
// apps/api:
//   npx ts-node prisma/seed-iam-courses.ts
//
// Safe to re-run: each course is looked up by its unique `title` and its
// resource links are replaced wholesale (same approach as
// TrainingService.updateCourse), so re-running this after adding more
// courses below just updates/adds rows without duplicating anything.
//
// This only creates the catalog entries — nobody is assigned to them.
// Assign specific courses to specific employees from the Learning Center's
// IAM Engineering tab (or Training Catalog admin) afterwards, same as any
// other course.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCourse {
  title: string;
  category: 'IAM_UDEMY' | 'IAM_CLOUDFOUNDATION' | 'IAM_SECAPPS';
  url: string;
  description?: string;
}

const COURSES: SeedCourse[] = [
  // --- Udemy ---
  { title: 'Identity and Access Management (IAM)', category: 'IAM_UDEMY', url: 'https://www.udemy.com/course/identity-and-access-management-iam/' },
  {
    title: 'Identity and Access Management (IAM/IAG/IGA)',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/identity-and-access-governance-iam-iag/',
  },
  {
    title: 'Microsoft Entra ID (formerly Azure AD) Administration Course',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/azureadcourse/',
  },
  {
    title: 'Active Directory on Windows Server',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/share/101YnO3@4kFEusc-VdAI_qShMQH9VIPNXiS11Bd5pd1gVgnBzEfPOEcnd-dkpPvlTuK4lioA3w==/',
  },
  {
    title: 'The Complete Course of Okta',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/share/109afW3@wvSmHcSthG3-OnzqaJVYuYYQiIbm2eO226hCPB2rQ8bqGYYVjlWdpcGzZJYDvrfZVA==/',
  },
  {
    title: 'CyberArk Certification with IAM & PAM Guidelines | Mastery',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/cyberark-certification-with-iam-pam-guidelines-mastery/',
  },
  {
    title: 'Privileged Access Management (PAM) with CyberArk',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/privileged-access-management-pam/',
  },
  {
    title: 'AZ-800: Administering Windows Server Hybrid Core Infrastructure',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/share/105Pqo3@mfZ_qFP1ugFEv2Tg28cgIKbGalUetqAfcLiPhIzzUlseXwdftBELubERa2VtYH8UuQ==/',
  },
  {
    title: 'Intune (MDM / MAM) Microsoft Training Course with Hands-On',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/intune-training-with-microsoft-endpoint-manager-mdm-mam/',
  },
  {
    title: 'SC-300: Microsoft Identity and Access Administrator',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/sc-300-course-microsoft-identity-and-access-administrator/',
    description: 'Also covers Microsoft Defender.',
  },
  {
    title: 'Identity and Access Management - CA SiteMinder [Part 1]',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/ca-siteminder-part-1/',
  },
  {
    title: 'Identity and Access Management: ForgeRock OpenIDM',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/identity-and-access-management-forerock-openidm-653/',
  },
  {
    title: 'Identity and Access Management: ForgeRock OpenAM [Part 1]',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/iamopenam-part1/',
  },
  {
    title: 'Identity and Access Management: ForgeRock OpenAM [Part 2]',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/iam-accessmanager-part-2/',
  },
  {
    title: 'Privileged Account (Access) Management (PAM)',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/privileged-account-access-management-pam/',
  },
  {
    title: 'Complete Windows Server Administration Course',
    category: 'IAM_UDEMY',
    url: 'https://www.udemy.com/course/complete-windows-server-2016-administration-course/',
  },

  // --- CloudFoundation ---
  { title: 'Okta Self-Paced (Latest)', category: 'IAM_CLOUDFOUNDATION', url: 'https://learning.cloudfoundation.com/courses/2420821/' },
  { title: 'Okta Self-Paced', category: 'IAM_CLOUDFOUNDATION', url: 'https://learning.cloudfoundation.com/courses/1287273/lectures/48292189' },
  { title: 'PingOne Self-Paced', category: 'IAM_CLOUDFOUNDATION', url: 'https://learning.cloudfoundation.com/courses/2735053/' },
  { title: 'PingAccess Self-Paced', category: 'IAM_CLOUDFOUNDATION', url: 'https://learning.cloudfoundation.com/courses/2735067/' },

  // --- SecApps Learning ---
  {
    title: 'SailPoint Self-Paced Full Training',
    category: 'IAM_SECAPPS',
    url: 'https://secappslearning.com/course/sailpoint-self-paced-full-training',
  },
  {
    title: 'Saviynt IAM Self-Paced Online Training',
    category: 'IAM_SECAPPS',
    url: 'https://secappslearning.com/usercoursedetails/?url=saviynt-iam-self-paced-online-training&course=course2643',
  },
  {
    title: 'SailPoint IdentityNow (ISC) Training — Self-Paced IAM Course',
    category: 'IAM_SECAPPS',
    url: 'https://secappslearning.com/course/sailpoint-identitynow-idn-identity-security-cloud-isc-selfpaced-online-training',
    description: 'Having access issues on this one specifically? Call Sanjay directly.',
  },
  {
    title: 'CyberArk Full Training (SecApps)',
    category: 'IAM_SECAPPS',
    url: 'https://secappslearning.com/usercoursedetails/?url=cyberark-full-training&course=course7887',
  },
];

async function main() {
  for (const c of COURSES) {
    const existing = await prisma.trainingCourse.findUnique({ where: { title: c.title } });
    if (existing) {
      await prisma.trainingResource.deleteMany({ where: { courseId: existing.id } });
      await prisma.trainingCourse.update({
        where: { id: existing.id },
        data: {
          category: c.category,
          description: c.description ?? null,
          resources: { create: [{ url: c.url, order: 0 }] },
        },
      });
      console.log(`Updated: ${c.title}`);
    } else {
      await prisma.trainingCourse.create({
        data: {
          title: c.title,
          category: c.category,
          description: c.description,
          resources: { create: [{ url: c.url, order: 0 }] },
        },
      });
      console.log(`Created: ${c.title}`);
    }
  }
  console.log(`\nDone — ${COURSES.length} IAM Engineering courses seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
