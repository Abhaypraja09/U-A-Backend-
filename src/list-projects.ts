import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all projects...');
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, status: true, projectId: true }
  });
  console.log('Projects list:', JSON.stringify(projects, null, 2));
}

main().finally(() => prisma.$disconnect());
