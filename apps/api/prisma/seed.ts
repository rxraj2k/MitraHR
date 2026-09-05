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
