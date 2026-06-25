"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get live factory feed (Active Machine Logs)
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const activeMachineLogs = await index_1.prisma.machineLog.findMany({
            where: { status: 'active' },
            include: {
                machine: true,
                operator: { select: { name: true, staffId: true, role: true, department: true } },
                project: { select: { name: true, projectId: true } }
            },
            orderBy: { startTime: 'desc' }
        });
        res.json(activeMachineLogs);
    }
    catch (error) {
        console.error('Live Feed Error:', error);
        res.status(500).json({ message: 'Server error fetching live feed' });
    }
});
exports.default = router;
//# sourceMappingURL=liveFeedRoutes.js.map