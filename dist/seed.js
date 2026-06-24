"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding initial data...');
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
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
//# sourceMappingURL=seed.js.map