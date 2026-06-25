"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get Machine Logs
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const logs = await index_1.prisma.machineLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: { machine: { select: { name: true } }, project: { select: { name: true } } }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching machine logs' });
    }
});
// Live Feed Endpoint
router.get('/live-feed', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const activeLogs = await index_1.prisma.machineLog.findMany({
            where: { status: 'active' },
            orderBy: { startTime: 'desc' },
            include: {
                machine: { select: { name: true, type: true } },
                project: { select: { name: true, projectId: true, requirements: true } },
                operator: { select: { name: true, staffId: true } }
            }
        });
        res.json(activeLogs);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching live feed' });
    }
});
// Create Machine Log
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { machineId, projectId, startTime, downtime, remarks } = req.body;
        const operatorId = req.user?.id;
        const newLog = await index_1.prisma.machineLog.create({
            data: {
                machineId,
                projectId: projectId || null,
                startTime: new Date(startTime),
                downtime: Number(downtime || 0),
                remarks,
                operatorId
            }
        });
        res.status(201).json(newLog);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating machine log' });
    }
});
// Machine Clock-In (Two-Step workflow)
router.post('/clock-in', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { machineId, projectId, machinePhotoUrl, unitPhotoUrl, softwarePhotoUrl, remarks } = req.body;
        const operatorId = req.user?.id;
        // Auto-complete any existing active machine logs for this operator
        await index_1.prisma.machineLog.updateMany({
            where: { operatorId, status: 'active' },
            data: { status: 'completed', endTime: new Date() }
        });
        const newLog = await index_1.prisma.machineLog.create({
            data: {
                machineId,
                projectId: projectId || null,
                startTime: new Date(),
                machinePhotoUrl,
                unitPhotoUrl,
                softwarePhotoUrl,
                remarks,
                operatorId,
                status: 'active'
            }
        });
        res.status(201).json(newLog);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during machine clock-in' });
    }
});
exports.default = router;
//# sourceMappingURL=machineLogRoutes.js.map