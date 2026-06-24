"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() { await prisma.approvalRecord.deleteMany(); await prisma.shopDrawing.deleteMany(); await prisma.quotation.deleteMany(); await prisma.invoice.deleteMany(); await prisma.projectMaterial.deleteMany(); await prisma.productionLog.deleteMany(); await prisma.project.deleteMany(); await prisma.inventory.deleteMany(); console.log('Database cleared!'); }
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=resetDb.js.map