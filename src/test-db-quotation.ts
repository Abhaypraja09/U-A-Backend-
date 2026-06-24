import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projectId = '6a3b6ba3de8711492c939f99';
  console.log('Fetching project:', projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { quotations: true }
  });
  console.log('Project Status:', project?.status);
  console.log('Quotations Count:', project?.quotations?.length);
  console.log('Quotations Details:', JSON.stringify(project?.quotations, null, 2));
}

main().finally(() => prisma.$disconnect());
