import bcrypt from 'bcrypt';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const email = 'admin@example.com';
  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    console.log(`Seed skipped: ${email} already exists.`);
    return;
  }

  const password = await bcrypt.hash('Admin@123', 10);
  await prisma.user.create({
    data: {
      email,
      password,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true
    }
  });

  console.log(`Seed complete: created ${email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
