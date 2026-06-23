import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting dummy data...');
  
  await prisma.productionLog.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.design.deleteMany({});
  await prisma.crate.deleteMany({});
  await prisma.dispatch.deleteMany({});
  await prisma.projectMaterial.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.lead.deleteMany({});
  
  console.log('Dummy data deleted successfully!');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
