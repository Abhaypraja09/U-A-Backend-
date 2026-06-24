"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get Labor Contracts
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const contracts = await index_1.prisma.laborContract.findMany({
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { name: true } } }
        });
        res.json(contracts);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching labor contracts' });
    }
});
// Create Labor Contract
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId, contractorName, jobType, rate, totalAmount } = req.body;
        const newContract = await index_1.prisma.laborContract.create({
            data: {
                projectId,
                contractorName,
                jobType,
                rate: Number(rate),
                totalAmount: Number(totalAmount),
                paidAmount: 0,
                status: 'in_progress'
            }
        });
        res.status(201).json(newContract);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating labor contract' });
    }
});
exports.default = router;
//# sourceMappingURL=laborRoutes.js.map