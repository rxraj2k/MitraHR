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
