import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@unnati.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@unnati.com',
      password: hashedPassword,
      role: 'admin',
      department: 'Management'
    }
  });
  console.log('Admin User:', admin.email);

  // Seed Worker
  const worker = await prisma.user.upsert({
    where: { email: 'worker1@unnati.com' },
    update: {},
    create: {
      name: 'Raju Worker',
      email: 'worker1@unnati.com',
      password: hashedPassword,
      role: 'worker',
      department: 'Production',
      wage: 500,
      otRate: 100
    }
  });
  console.log('Worker User:', worker.email);

  // Seed Machines (if empty)
  const machinesCount = await prisma.machine.count();
  if (machinesCount === 0) {
    for (let i = 1; i <= 50; i++) {
      await prisma.machine.create({
        data: {
          name: `Machine ${i}`,
          type: 'CNC',
          status: 'running'
        }
      });
    }
    console.log('Seeded 50 Machines');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
