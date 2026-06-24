"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get Electricity Logs
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const logs = await index_1.prisma.electricityLog.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching electricity logs' });
    }
});
// Add Electricity Log
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { month, meterReading, unitsConsumed, totalBill } = req.body;
        const newLog = await index_1.prisma.electricityLog.create({
            data: {
                month,
                meterReading: Number(meterReading),
                unitsConsumed: Number(unitsConsumed),
                totalBill: Number(totalBill),
                paymentStatus: 'pending'
            }
        });
        res.status(201).json(newLog);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating electricity log' });
    }
});
exports.default = router;
//# sourceMappingURL=electricityRoutes.js.map