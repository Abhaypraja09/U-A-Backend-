"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get dispatches
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const dispatches = await index_1.prisma.dispatch.findMany({
            orderBy: { createdAt: 'desc' },
            include: { project: { select: { name: true } }, crates: true }
        });
        res.json(dispatches);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching dispatches' });
    }
});
// Create Dispatch
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId, vehicleNumber, driverDetails, lrNumber } = req.body;
        const newDispatch = await index_1.prisma.dispatch.create({
            data: {
                projectId,
                vehicleNumber,
                driverDetails,
                lrNumber,
                status: 'in_transit'
            }
        });
        res.status(201).json(newDispatch);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating dispatch' });
    }
});
exports.default = router;
//# sourceMappingURL=dispatchRoutes.js.map