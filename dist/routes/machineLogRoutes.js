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
            include: { machine: { select: { name: true } }, project: { select: { name: true } }, operator: { select: { name: true } } }
        });
        res.json(logs);
    }
    catch (error) {
        console.error(error);
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
        console.error(error);
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
        console.error(error);
        res.status(500).json({ message: 'Server error creating machine log' });
    }
});
// Machine Clock-In (One-Step workflow for worker)
router.post('/clock-in', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { machineId, machinePhotoUrl, unitPhotoUrl, softwarePhotoUrl, remarks } = req.body;
        const operatorId = req.user?.id;
        const newLog = await index_1.prisma.machineLog.create({
            data: {
                machineId,
                startTime: new Date(),
                machinePhotoUrl,
                unitPhotoUrl,
                softwarePhotoUrl,
                remarks,
                operatorId,
                status: 'active',
                approvalStatus: 'pending'
            }
        });
        res.status(201).json(newLog);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during machine clock-in' });
    }
});
// Get ALL Machine Logs for Today
router.get('/daily-logs', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const dailyLogs = await index_1.prisma.machineLog.findMany({
            where: {
                startTime: { gte: startOfDay }
            },
            orderBy: { startTime: 'desc' },
            include: {
                machine: { select: { name: true } },
                project: { select: { name: true, projectId: true } },
                operator: { select: { name: true, staffId: true } }
            }
        });
        res.json(dailyLogs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching daily machine logs' });
    }
});
// Machine Clock-Out (Any user can end an active log)
router.post('/clock-out', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { logId, remarks, endMachinePhotoUrl, endUnitPhotoUrl, endSoftwarePhotoUrl } = req.body;
        const log = await index_1.prisma.machineLog.findFirst({
            where: { id: logId, status: 'active' }
        });
        if (!log)
            return res.status(404).json({ message: 'Active machine log not found' });
        const endTime = new Date();
        const hours = (endTime.getTime() - log.startTime.getTime()) / (1000 * 60 * 60);
        const updatedLog = await index_1.prisma.machineLog.update({
            where: { id: logId },
            data: {
                endTime: new Date(),
                status: 'completed',
                remarks: remarks ? `${log.remarks || ''}\nOut: ${remarks}`.trim() : log.remarks,
                endMachinePhotoUrl,
                endUnitPhotoUrl,
                endSoftwarePhotoUrl
            }
        });
        await index_1.prisma.machine.update({
            where: { id: log.machineId },
            data: { totalRunHours: { increment: hours } }
        });
        res.json(updatedLog);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during machine clock-out' });
    }
});
// Admin: Approve Log
router.put('/approve/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId } = req.body;
        const updated = await index_1.prisma.machineLog.update({
            where: { id: req.params.id },
            data: { approvalStatus: 'approved', projectId }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error approving log' });
    }
});
// Admin: Reject Log
router.put('/reject/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const updated = await index_1.prisma.machineLog.update({
            where: { id: req.params.id },
            data: { approvalStatus: 'rejected', status: 'completed', endTime: new Date() }
        });
        res.json(updated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error rejecting log' });
    }
});
exports.default = router;
//# sourceMappingURL=machineLogRoutes.js.map