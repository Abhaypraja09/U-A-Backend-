"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get live factory feed
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        // Get all machines
        const machines = await index_1.prisma.machine.findMany();
        // Get active attendances with machine info
        const activeAttendances = await index_1.prisma.attendance.findMany({
            where: { checkOut: null, machineId: { not: null } },
            include: { user: { select: { name: true, role: true, department: true } } }
        });
        // Get active production logs (stages) mapped to machines
        const activeLogs = await index_1.prisma.productionLog.findMany({
            where: { status: 'in_progress', machineId: { not: null } },
            include: { project: { select: { name: true } } }
        });
        const liveFeed = machines.map(machine => {
            const currentWorkerSession = activeAttendances.find(a => a.machineId === machine.id);
            const currentProduction = activeLogs.find(l => l.machineId === machine.id);
            return {
                ...machine,
                currentWorker: currentWorkerSession ? currentWorkerSession.user : null,
                sessionStartedAt: currentWorkerSession ? currentWorkerSession.checkIn : null,
                currentProject: currentProduction ? currentProduction.project.name : null,
                currentStage: currentProduction ? currentProduction.stage : null,
                status: currentWorkerSession ? 'active' : 'idle' // Or check if machine has production log running autonomously
            };
        });
        res.json(liveFeed);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching live feed' });
    }
});
exports.default = router;
//# sourceMappingURL=liveFeedRoutes.js.map