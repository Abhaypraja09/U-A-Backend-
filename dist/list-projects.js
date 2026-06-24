"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Fetching all projects...');
    const projects = await prisma.project.findMany({
        select: { id: true, name: true, status: true, projectId: true }
    });
    console.log('Projects list:', JSON.stringify(projects, null, 2));
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=list-projects.js.map