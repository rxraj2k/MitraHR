import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@mitrahr.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', email);
    return;
  }
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Seeded admin user:');
  console.log('  email:   ', email);
  console.log('  password:', 'ChangeMe123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
