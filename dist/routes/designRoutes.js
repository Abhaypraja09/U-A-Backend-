"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get designs by project
router.get('/project/:projectId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const designs = await index_1.prisma.design.findMany({
            where: { projectId: projectId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(designs);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching designs' });
    }
});
// Upload a new design (URLs for now, actual S3 logic later)
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId, cadUrl, drawingUrl, renderUrl } = req.body;
        // Auto increment revision
        const existingCount = await index_1.prisma.design.count({ where: { projectId: String(projectId) } });
        const newDesign = await index_1.prisma.design.create({
            data: {
                projectId,
                cadUrl,
                drawingUrl,
                renderUrl,
                revisionNumber: existingCount + 1,
                status: 'pending'
            }
        });
        res.status(201).json(newDesign);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating design' });
    }
});
// Approve Design
router.patch('/:id/approve', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'internal' or 'client'
        const status = type === 'client' ? 'client_approved' : 'internal_approved';
        const updatedDesign = await index_1.prisma.design.update({
            where: { id: id },
            data: { status }
        });
        res.json(updatedDesign);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error approving design' });
    }
});
exports.default = router;
//# sourceMappingURL=designRoutes.js.map