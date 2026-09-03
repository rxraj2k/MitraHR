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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
