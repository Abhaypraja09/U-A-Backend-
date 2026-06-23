require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing totalLeads...');
    await prisma.lead.count();
    console.log('Testing activeProjects...');
    await prisma.project.count({ where: { status: 'in_progress' } });
    console.log('Testing invoices...');
    await prisma.invoice.findMany({ select: { totalAmount: true, balanceAmount: true } });
    console.log('Testing laborContracts...');
    await prisma.laborContract.findMany();
    console.log('Testing expenses...');
    await prisma.expense.findMany();
    console.log('Testing electricity...');
    await prisma.electricityLog.findMany();
    console.log('All queries passed.');
  } catch (err) {
    console.error('Error on query:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
