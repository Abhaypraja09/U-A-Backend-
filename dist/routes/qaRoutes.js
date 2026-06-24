"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get QA records
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const records = await index_1.prisma.qA_QC.findMany({
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { name: true } } }
        });
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching QA records' });
    }
});
// Create QA record
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId, dimensionOk, finishOk, crackOk, remarks } = req.body;
        const inspectedBy = req.user?.id;
        const status = (dimensionOk && finishOk && crackOk) ? 'passed' : 'failed';
        const newQA = await index_1.prisma.qA_QC.create({
            data: {
                projectId,
                dimensionOk,
                finishOk,
                crackOk,
                remarks,
                status,
                inspectedBy
            }
        });
        res.status(201).json(newQA);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating QA record' });
    }
});
exports.default = router;
//# sourceMappingURL=qaRoutes.js.map