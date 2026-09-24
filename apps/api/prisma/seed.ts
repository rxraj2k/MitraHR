import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEPARTMENTS = ['IAM', 'DevOps', 'Cyber Security', 'AI Engineering'];

const DESIGNATIONS = [
  'IAM Engineer',
  'Senior IAM Engineer',
  'DevOps Engineer',
  'Senior DevOps Engineer',
  'AI Intern',
  'AI Engineer',
  'Team Lead',
  'Manager',
];

const SKILLS = [
  // IAM
  'Okta',
  'Ping Identity',
  'SailPoint IdentityIQ',
  'Microsoft Entra ID (Azure AD)',
  'Azure AD B2C',
  'ForgeRock',
  'OneLogin',
  'CyberArk PAM',
  'RSA SecurID',
  'Privileged Access Management (PAM)',
  'Multi-Factor Authentication (MFA)',
  'SAML/OAuth2/OIDC',
  'SCIM Provisioning',
  'LDAP',
  'Kerberos',
  'Active Directory',
  'Identity Governance & Administration (IGA)',
  'Zero Trust Architecture',
  // DevOps
  'AWS',
  'Azure',
  'Google Cloud Platform',
  'Docker',
  'Kubernetes',
  'Helm',
  'Terraform',
  'Ansible',
  'Chef/Puppet',
  'Jenkins',
  'GitLab CI',
  'CircleCI',
  'GitHub Actions',
  'CI/CD Pipeline Design',
  'Linux Administration',
  'Nginx',
  'VMware',
  'Bash Scripting',
  'Python Scripting',
  'Prometheus/Grafana',
  'ELK Stack',
  'Site Reliability Engineering (SRE)',
  // Cyber Security
  'SIEM (Splunk/QRadar)',
  'SOC Operations',
  'Vulnerability Assessment',
  'Penetration Testing',
  'Red Teaming',
  'Firewall Management',
  'Incident Response',
  'Threat Intelligence',
  'Malware Analysis',
  'Data Loss Prevention (DLP)',
  'Cloud Security Posture Management (CSPM)',
  'ISO 27001 / Compliance',
  'GRC (Governance, Risk & Compliance)',
  'OWASP Top 10',
  'Network Security',
  'Endpoint Security (EDR/XDR)',
  // AI Engineering — added for Sprint 19's Talent Directory (this
  // department previously had no matching skills to assign at all).
  'Python (AI/ML)',
  'Machine Learning',
  'Deep Learning',
  'Large Language Models (LLMs)',
  'Prompt Engineering',
  'LangChain',
  'TensorFlow',
  'PyTorch',
  'Retrieval-Augmented Generation (RAG)',
  'Vector Databases',
  'MLOps',
  'Data Engineering (ETL/Pipelines)',
  'Computer Vision',
  'Natural Language Processing (NLP)',
  'Node.js',
  'React',
];


const LEAVE_TYPES = [
  { name: 'Paid Leave', code: 'PL', annualQuota: 12, accrualMethod: 'MONTHLY', isPaid: true, carryForwardAllowed: false },
  { name: 'Loss of Pay', code: 'LOP', annualQuota: null, accrualMethod: 'NONE', isPaid: false, carryForwardAllowed: false },
  { name: 'Maternity Leave', code: 'MATERNITY', annualQuota: 182, accrualMethod: 'UPFRONT', isPaid: true, carryForwardAllowed: false },
  { name: 'Paternity Leave', code: 'PATERNITY', annualQuota: 7, accrualMethod: 'UPFRONT', isPaid: true, carryForwardAllowed: false },
  // Balance for this one isn't accrued by annualQuota/accrualMethod — it's
  // earned entry-by-entry via approved Comp-Off Ledger rows (Log a Day
  // Worked). annualQuota/accrualMethod are placeholders here and ignored.
  { name: 'Compensatory Off', code: 'COMP_OFF', annualQuota: null, accrualMethod: 'NONE', isPaid: true, carryForwardAllowed: true, isCompOff: true },
];

// 2026 US + India holidays (add 2027+ from Settings > Holidays as the year approaches).
const HOLIDAYS_2026: Array<{ name: string; date: string; region: string }> = [
  { name: "New Year's Day", date: '2026-01-01', region: 'US' },
  { name: 'Martin Luther King Jr. Day', date: '2026-01-19', region: 'US' },
  { name: "Washington's Birthday (Presidents' Day)", date: '2026-02-16', region: 'US' },
  { name: 'Memorial Day', date: '2026-05-25', region: 'US' },
  { name: 'Juneteenth', date: '2026-06-19', region: 'US' },
  { name: 'Independence Day (observed)', date: '2026-07-03', region: 'US' },
  { name: 'Labor Day', date: '2026-09-07', region: 'US' },
  { name: 'Columbus Day', date: '2026-10-12', region: 'US' },
  { name: 'Veterans Day', date: '2026-11-11', region: 'US' },
  { name: 'Thanksgiving Day', date: '2026-11-26', region: 'US' },
  { name: 'Christmas Day', date: '2026-12-25', region: 'US' },
  { name: 'Republic Day', date: '2026-01-26', region: 'INDIA' },
  { name: 'Holi', date: '2026-03-04', region: 'INDIA' },
  { name: 'Ram Navami', date: '2026-03-26', region: 'INDIA' },
  { name: 'Good Friday', date: '2026-04-03', region: 'INDIA' },
  { name: 'Buddha Purnima', date: '2026-05-01', region: 'INDIA' },
  { name: 'Independence Day', date: '2026-08-15', region: 'INDIA' },
  { name: 'Gandhi Jayanti', date: '2026-10-02', region: 'INDIA' },
  { name: 'Dussehra', date: '2026-10-20', region: 'INDIA' },
  { name: 'Diwali', date: '2026-11-08', region: 'INDIA' },
  { name: "Guru Nanak's Birthday", date: '2026-11-24', region: 'INDIA' },
];


// Technology/tool lookup, grouped by project category, for the Project
// form's "specific area or tool" dropdown. Editable from Settings — this
// is just a generous starting list.
const TECHNOLOGIES: Array<{ name: string; category: string }> = [
  // IAM
  { name: 'SailPoint IdentityIQ (IIQ)', category: 'IAM' },
  { name: 'SailPoint Identity Security Cloud (ISC)', category: 'IAM' },
  { name: 'Okta', category: 'IAM' },
  { name: 'Microsoft Entra ID (Azure AD)', category: 'IAM' },
  { name: 'Azure AD B2C', category: 'IAM' },
  { name: 'Ping Identity (PingFederate/PingOne)', category: 'IAM' },
  { name: 'ForgeRock', category: 'IAM' },
  { name: 'OneLogin', category: 'IAM' },
  { name: 'IBM Security Verify', category: 'IAM' },
  { name: 'Oracle Identity Governance (OIG)', category: 'IAM' },
  { name: 'Oracle Access Manager (OAM)', category: 'IAM' },
  { name: 'Saviynt', category: 'IAM' },
  { name: 'CyberArk Identity', category: 'IAM' },
  { name: 'CyberArk PAM', category: 'IAM' },
  { name: 'Delinea (Thycotic) Secret Server', category: 'IAM' },
  { name: 'BeyondTrust Password Safe', category: 'IAM' },
  { name: 'One Identity Manager', category: 'IAM' },
  { name: 'RSA SecurID', category: 'IAM' },
  { name: 'SecureAuth', category: 'IAM' },
  { name: 'Broadcom Siteminder (CA SSO)', category: 'IAM' },
  { name: 'AWS IAM Identity Center', category: 'IAM' },
  { name: 'Google Cloud Identity', category: 'IAM' },
  // Active Directory
  { name: 'Active Directory Domain Services (AD DS)', category: 'ACTIVE_DIRECTORY' },
  { name: 'Azure AD Connect / Entra Connect', category: 'ACTIVE_DIRECTORY' },
  { name: 'Active Directory Federation Services (AD FS)', category: 'ACTIVE_DIRECTORY' },
  { name: 'Active Directory Lightweight Directory Services (AD LDS)', category: 'ACTIVE_DIRECTORY' },
  { name: 'Azure AD Domain Services', category: 'ACTIVE_DIRECTORY' },
  { name: 'Group Policy Management (GPO)', category: 'ACTIVE_DIRECTORY' },
  { name: 'One Identity Active Roles', category: 'ACTIVE_DIRECTORY' },
  { name: 'Netwrix Auditor for Active Directory', category: 'ACTIVE_DIRECTORY' },
  { name: 'ManageEngine ADManager Plus', category: 'ACTIVE_DIRECTORY' },
  { name: 'ManageEngine ADAudit Plus', category: 'ACTIVE_DIRECTORY' },
  // Cloud Security
  { name: 'AWS Security Hub', category: 'CLOUD_SECURITY' },
  { name: 'AWS GuardDuty', category: 'CLOUD_SECURITY' },
  { name: 'AWS Config', category: 'CLOUD_SECURITY' },
  { name: 'Microsoft Defender for Cloud', category: 'CLOUD_SECURITY' },
  { name: 'Google Security Command Center', category: 'CLOUD_SECURITY' },
  { name: 'Prisma Cloud (Palo Alto)', category: 'CLOUD_SECURITY' },
  { name: 'Wiz', category: 'CLOUD_SECURITY' },
  { name: 'Orca Security', category: 'CLOUD_SECURITY' },
  { name: 'CrowdStrike Falcon Cloud Security', category: 'CLOUD_SECURITY' },
  { name: 'Check Point CloudGuard', category: 'CLOUD_SECURITY' },
  { name: 'Trend Micro Cloud One', category: 'CLOUD_SECURITY' },
  { name: 'Aqua Security', category: 'CLOUD_SECURITY' },
  { name: 'Lacework', category: 'CLOUD_SECURITY' },
  { name: 'Qualys CloudView', category: 'CLOUD_SECURITY' },
  { name: 'Tenable Cloud Security', category: 'CLOUD_SECURITY' },
  // Cyber Security
  { name: 'Splunk', category: 'CYBER_SECURITY' },
  { name: 'IBM QRadar', category: 'CYBER_SECURITY' },
  { name: 'Microsoft Sentinel', category: 'CYBER_SECURITY' },
  { name: 'CrowdStrike Falcon (EDR)', category: 'CYBER_SECURITY' },
  { name: 'SentinelOne', category: 'CYBER_SECURITY' },
  { name: 'Palo Alto Cortex XDR', category: 'CYBER_SECURITY' },
  { name: 'Fortinet FortiSIEM', category: 'CYBER_SECURITY' },
  { name: 'Rapid7 InsightIDR', category: 'CYBER_SECURITY' },
  { name: 'Tenable Nessus', category: 'CYBER_SECURITY' },
  { name: 'Qualys VMDR', category: 'CYBER_SECURITY' },
  { name: 'VMware Carbon Black', category: 'CYBER_SECURITY' },
  { name: 'Trend Micro Vision One', category: 'CYBER_SECURITY' },
  { name: 'Darktrace', category: 'CYBER_SECURITY' },
  { name: 'Proofpoint', category: 'CYBER_SECURITY' },
  { name: 'Mimecast', category: 'CYBER_SECURITY' },
  { name: 'Cisco Umbrella', category: 'CYBER_SECURITY' },
  { name: 'Check Point Next-Gen Firewall', category: 'CYBER_SECURITY' },
  { name: 'Fortinet FortiGate', category: 'CYBER_SECURITY' },
  { name: 'Palo Alto Next-Gen Firewall', category: 'CYBER_SECURITY' },
  { name: 'Burp Suite', category: 'CYBER_SECURITY' },
  // DevOps
  { name: 'AWS', category: 'DEVOPS' },
  { name: 'Microsoft Azure', category: 'DEVOPS' },
  { name: 'Google Cloud Platform', category: 'DEVOPS' },
  { name: 'Docker', category: 'DEVOPS' },
  { name: 'Kubernetes', category: 'DEVOPS' },
  { name: 'Helm', category: 'DEVOPS' },
  { name: 'Terraform', category: 'DEVOPS' },
  { name: 'Ansible', category: 'DEVOPS' },
  { name: 'Chef', category: 'DEVOPS' },
  { name: 'Puppet', category: 'DEVOPS' },
  { name: 'Jenkins', category: 'DEVOPS' },
  { name: 'GitLab CI/CD', category: 'DEVOPS' },
  { name: 'GitHub Actions', category: 'DEVOPS' },
  { name: 'CircleCI', category: 'DEVOPS' },
  { name: 'Argo CD', category: 'DEVOPS' },
  { name: 'Spinnaker', category: 'DEVOPS' },
  { name: 'Prometheus', category: 'DEVOPS' },
  { name: 'Grafana', category: 'DEVOPS' },
  { name: 'ELK Stack (Elasticsearch/Logstash/Kibana)', category: 'DEVOPS' },
  { name: 'Datadog', category: 'DEVOPS' },
  { name: 'New Relic', category: 'DEVOPS' },
  { name: 'Nagios', category: 'DEVOPS' },
  { name: 'Nginx', category: 'DEVOPS' },
  { name: 'HashiCorp Vault', category: 'DEVOPS' },
  { name: 'HashiCorp Consul', category: 'DEVOPS' },
  { name: 'Packer', category: 'DEVOPS' },
  { name: 'AWS CloudFormation', category: 'DEVOPS' },
  { name: 'Azure Bicep / ARM Templates', category: 'DEVOPS' },
];

// Seeded from the actual onboarding curriculum the company hands new hires
// today (a Zoho Notebook page full of Udemy/YouTube/Drive links) — see
// TrainingCourse. Each course can carry more than one resource link
// (alternates, or a main course + a follow-along doc), and `restrictedTo`
// marks the handful that only apply to one role (currently just Git
// Branching, for DevOps engineers) — informational, not auto-enforced.
const TRAINING_COURSES: Array<{
  title: string;
  category: string;
  description?: string;
  restrictedTo?: string;
  order: number;
  resources: Array<{ label?: string; url: string }>;
}> = [
  {
    title: 'Scrum Tutorial',
    category: 'AGILE_TOOLS',
    order: 1,
    resources: [
      { label: 'Udemy: Agile Fundamentals (Scrum & Kanban)', url: 'https://www.udemy.com/share/1013Ii3@OXUmwqFcqZi2fyE2aUaLqvw663_Q7caB4OIM8-yaErWpOXydWzqBPWqRm2L6NgnHQA==/' },
      { label: 'YouTube', url: 'https://youtu.be/s3y95I79D_Q?si=NGdASQMMnLbCOX-X' },
      { label: 'YouTube (alternate)', url: 'https://youtu.be/SWDhGSZNF9M?si=lrav7W7ds6JXSlwV' },
    ],
  },
  {
    title: 'Agile Tutorial',
    category: 'AGILE_TOOLS',
    order: 2,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/vxpKA9UuM1w?si=wIvvtrquL9VQPZIj' }],
  },
  {
    title: 'Jira Tutorial',
    category: 'AGILE_TOOLS',
    description: 'Set up a free Jira trial account and follow along hands-on.',
    order: 3,
    resources: [
      { label: 'YouTube', url: 'https://youtu.be/OKK3gMRdLzg?si=tGyy0OS1FjjGcWlj' },
      { label: 'YouTube (alternate)', url: 'https://youtu.be/ekQOcHf8cBc?si=Xo6X4mlXwSu-ntHE' },
    ],
  },
  {
    title: 'Confluence',
    category: 'AGILE_TOOLS',
    order: 4,
    resources: [
      { label: 'YouTube', url: 'https://youtu.be/TmeAE2uRJGY?si=yv3Wtm5oEatxyOuW' },
      { label: 'YouTube (alternate)', url: 'https://youtu.be/LOFdJbtQY-A?si=snvSrDPIzEKswXO2' },
    ],
  },
  {
    title: 'Outlook Tutorial',
    category: 'MS365',
    description:
      "You can configure our office email with Outlook. Step 1: Enable IMAP in Zoho Mail — Settings → Mail Accounts → IMAP, turn on IMAP access, and save. Step 2: Add the account in Outlook, choosing IMAP as the account type, using the settings shown in the reference screenshots below.",
    order: 1,
    resources: [
      { label: 'YouTube', url: 'https://youtu.be/4e_ghbyXcJ0?si=Nk_THs8ztxat5hWE' },
      { label: 'IMAP Setup Screenshot 1', url: 'https://drive.google.com/file/d/1XgQc802aZY5WTdqi5zi2anFBLXcjhgqT/view?usp=drive_link' },
      { label: 'IMAP Setup Screenshot 2', url: 'https://drive.google.com/file/d/1SeJ2LgumAVOV64ob3cUBtZYSsXXObL_P/view?usp=drive_link' },
    ],
  },
  {
    title: 'Writing Email',
    category: 'MS365',
    order: 2,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/U0gfefLM9to?si=oRF-tv6M_Y1HfI8H' }],
  },
  {
    title: 'MS Teams',
    category: 'MS365',
    order: 3,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/jJMdtoL5zsE?si=PCwVMBDDu3Sni27d' }],
  },
  {
    title: 'OneNote',
    category: 'MS365',
    order: 4,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/GJPfkvOFh0s?si=bLE41OeF9s5aqI8H' }],
  },
  {
    title: 'SharePoint',
    category: 'MS365',
    order: 5,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/Mu6oWtbk9Nc?si=NmS2rlstJz6ghS3b' }],
  },
  {
    title: 'Microsoft Excel',
    category: 'MS365',
    order: 6,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/OX-iyb-21tk?si=E22_VDtBCJlg776k' }],
  },
  {
    title: 'Zoho ToDo',
    category: 'ZOHO_TOOLS',
    order: 1,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/t-NzHfut85k?si=_wZ81P_KBqORMloV' }],
  },
  {
    title: 'Zoho Notebook',
    category: 'ZOHO_TOOLS',
    order: 2,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/gPGPQyxbrZA?si=dJJvvRG7vEaLrVFE' }],
  },
  {
    title: 'ServiceNow',
    category: 'SECURITY_IT',
    order: 1,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/TWRA3nBOQpo?si=U6S72fOmRHszla22' }],
  },
  {
    title: 'Phishing Awareness',
    category: 'SECURITY_IT',
    order: 2,
    resources: [{ label: 'Training Document', url: 'https://workdrive.zoho.in/file/zxtj25759dbdc93864be193a3076439ec5c32' }],
  },
  {
    title: 'Types of Environment',
    category: 'SECURITY_IT',
    order: 3,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/AlUXLJtSn_c?si=5rynkNMml4Vy8nu1' }],
  },
  {
    title: 'Git Branching',
    category: 'SECURITY_IT',
    restrictedTo: 'DevOps Engineer',
    order: 4,
    resources: [
      { label: 'YouTube', url: 'https://youtu.be/CwSEB0LoB74?si=WEEny3VmLHJB7nBj' },
      { label: 'YouTube (alternate)', url: 'https://youtu.be/6QNgbD2m7gA?si=T0jwERGavgH6B3hX' },
    ],
  },
  {
    title: 'AI Fundamentals',
    category: 'AI_TOOLS',
    description: "Only the specific topics linked below are required — no need to complete the entire Udemy course.",
    order: 1,
    resources: [
      { label: 'Udemy (selected topics only)', url: 'https://www.udemy.com/share/108c2m3@sitk4aUtmPGGWOe6HiTetCSkHq8CiE42XVXSZHruziYWTL09s5X_l0g6ejgpM1Vskw==/' },
      { label: 'YouTube (selected topics)', url: 'https://www.youtube.com/watch?v=5i2Hn8OG94o' },
    ],
  },
  {
    title: 'Parakeet AI Guide',
    category: 'AI_TOOLS',
    description: 'Do the hands-on exercises yourself using your own personal account.',
    order: 2,
    resources: [{ label: 'Guide', url: 'https://workdrive.zoho.in/file/3t87xf7af3f05dcfd45bc8c690c44300e8dce' }],
  },
  {
    title: 'US Time Zones',
    category: 'GLOBAL_SKILLS',
    order: 1,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/kjAMPug7i_M?si=LfHyUisWtjLJHut0' }],
  },
  {
    title: 'Daylight Saving (DST)',
    category: 'GLOBAL_SKILLS',
    order: 2,
    resources: [{ label: 'YouTube', url: 'https://youtu.be/DRQcW9ODoP4?si=UCwGZlJ7YugO0WEL' }],
  },
  {
    title: 'Improve Your American Accent',
    category: 'GLOBAL_SKILLS',
    description:
      "Dedicate at least 30 minutes Mon–Fri (5:00–5:30 PM) to this. Search YouTube for: \"American accent training for beginners\", \"US accent pronunciation tips\", \"American R sound pronunciation\", \"flap T sound American English\", \"American vowel sounds training\", \"American English intonation and rhythm\". Recommended channels: Rachel's English (start here — very structured), Accent's Way by Hadar Shemesh, EnglishAnyone, Speak English With Vanessa, ETJ English. Found a better resource? Share it so it can be added here.",
    order: 3,
    resources: [{ label: "Rachel's English (YouTube channel)", url: 'https://youtube.com/@rachelsenglish?si=uW47PT93FazrH9-v' }],
  },
];

async function main() {
  const email = 'admin@mitrahr.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    await prisma.user.create({
      data: { email, passwordHash, name: 'Admin', role: 'ADMIN' },
    });
    console.log('Seeded admin user:');
    console.log('  email:   ', email);
    console.log('  password:', 'ChangeMe123!');
  } else {
    console.log('Admin user already exists:', email);
  }

  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Departments ready: ${DEPARTMENTS.join(', ')}`);

  for (const name of DESIGNATIONS) {
    await prisma.designation.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Designations ready: ${DESIGNATIONS.join(', ')}`);

  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Skills ready: ${SKILLS.length} skills seeded`);


  for (const lt of LEAVE_TYPES) {
    await prisma.leaveType.upsert({ where: { name: lt.name }, update: {}, create: lt });
  }
  console.log(`Leave types ready: ${LEAVE_TYPES.map((l) => l.name).join(', ')}`);

  for (const h of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date_region_name: { date: new Date(h.date), region: h.region, name: h.name } },
      update: {},
      create: { name: h.name, date: new Date(h.date), region: h.region },
    });
  }
  console.log(`Holidays ready: ${HOLIDAYS_2026.length} for 2026 (US + India)`);

  for (const t of TECHNOLOGIES) {
    await prisma.technology.upsert({
      where: { name_category: { name: t.name, category: t.category } },
      update: {},
      create: t,
    });
  }
  console.log(`Technologies ready: ${TECHNOLOGIES.length} across 5 categories`);

  for (const c of TRAINING_COURSES) {
    await prisma.trainingCourse.upsert({
      where: { title: c.title },
      update: {},
      create: {
        title: c.title,
        category: c.category,
        description: c.description,
        restrictedTo: c.restrictedTo,
        order: c.order,
        resources: { create: c.resources.map((r, i) => ({ label: r.label, url: r.url, order: i })) },
      },
    });
  }
  console.log(`Training courses ready: ${TRAINING_COURSES.length} across 6 categories`);

  await prisma.counter.upsert({
    where: { name: 'employeeCode' },
    update: {},
    create: { name: 'employeeCode', value: 0 },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
