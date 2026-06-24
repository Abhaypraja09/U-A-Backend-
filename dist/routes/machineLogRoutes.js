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
exports.default = router;
//# sourceMappingURL=machineLogRoutes.js.map