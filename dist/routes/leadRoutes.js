"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get all leads
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const leads = await index_1.prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            include: { assignedTo: { select: { name: true } } }
        });
        res.json(leads);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching leads' });
    }
});
// Create a new lead
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { clientName, contact, email, source, architect, designer, status, notes, assignedToId } = req.body;
        const newLead = await index_1.prisma.lead.create({
            data: {
                clientName,
                contact,
                email,
                source,
                architect,
                designer,
                status: status || 'new',
                notes,
                assignedToId
            }
        });
        res.status(201).json(newLead);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating lead' });
    }
});
// Update lead status
router.patch('/:id/status', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updatedLead = await index_1.prisma.lead.update({
            where: { id: id },
            data: { status }
        });
        res.json(updatedLead);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error updating lead' });
    }
});
exports.default = router;
//# sourceMappingURL=leadRoutes.js.map