"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get all projects
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const projects = await index_1.prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: { assignedTo: { select: { name: true } } }
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching projects' });
    }
});
// Create a new project (Enquiry)
router.get('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const project = await index_1.prisma.project.findUnique({
            where: { id: String(id) },
            include: {
                assignedTo: { select: { name: true } },
                invoices: true,
                quotations: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!project)
            return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching project' });
    }
});
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { name, description, status, startDate, deadline, assignedToId, clientName, clientContact, clientEmail, enquirySource, location, requirements, createdAt } = req.body;
        // Auto-generate project ID (e.g. U-A-01) resetting per Financial Year
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed (April is 3)
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyStartDate = new Date(fyStartYear, 3, 1); // April 1st
        const count = await index_1.prisma.project.count({
            where: {
                createdAt: {
                    gte: fyStartDate
                }
            }
        });
        const projectId = `U-A-${String(count + 1).padStart(2, '0')}`;
        const newProject = await index_1.prisma.project.create({
            data: {
                projectId,
                name,
                description,
                clientName,
                clientContact,
                clientEmail,
                enquirySource,
                location,
                requirements,
                createdAt: createdAt ? new Date(createdAt) : undefined,
                status: status || 'enquiry',
                startDate: startDate ? new Date(startDate) : null,
                deadline: deadline ? new Date(deadline) : null,
                assignedToId
            }
        });
        res.status(201).json(newProject);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating project' });
    }
});
// Update project (Status, workflow progression)
router.patch('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.startDate)
            updateData.startDate = new Date(updateData.startDate);
        if (updateData.deadline)
            updateData.deadline = new Date(updateData.deadline);
        const updated = await index_1.prisma.project.update({
            where: { id: String(id) },
            data: updateData
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error updating project' });
    }
});
// Delete project
router.delete('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // In a real app we might soft-delete or cascade delete. For now, hard delete.
        // Need to delete related records first or add cascade in schema
        // Since we don't have cascade in schema, we should delete related records
        await index_1.prisma.shopDrawing.deleteMany({ where: { projectId: String(id) } });
        await index_1.prisma.quotation.deleteMany({ where: { projectId: String(id) } });
        await index_1.prisma.invoice.deleteMany({ where: { projectId: String(id) } });
        await index_1.prisma.projectMaterial.deleteMany({ where: { projectId: String(id) } });
        await index_1.prisma.productionLog.deleteMany({ where: { projectId: String(id) } });
        await index_1.prisma.project.delete({
            where: { id: String(id) }
        });
        res.json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error deleting project' });
    }
});
// Get materials reserved for project
router.get('/:id/materials', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const materials = await index_1.prisma.projectMaterial.findMany({
            where: { projectId: String(id) },
            include: { inventory: true },
            orderBy: { addedAt: 'desc' }
        });
        res.json(materials);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching project materials' });
    }
});
// Reserve material for project
router.post('/:id/materials', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { inventoryId, quantity, cost } = req.body;
        // Check inventory stock
        const inventory = await index_1.prisma.inventory.findUnique({ where: { id: inventoryId } });
        if (!inventory || inventory.quantity < quantity) {
            return res.status(400).json({ message: 'Not enough stock in inventory' });
        }
        // Deduct stock from inventory and add to project material inside a transaction
        const [projectMaterial, updatedInventory] = await index_1.prisma.$transaction([
            index_1.prisma.projectMaterial.create({
                data: {
                    projectId: String(id),
                    inventoryId,
                    quantity: Number(quantity),
                    cost: Number(cost)
                }
            }),
            index_1.prisma.inventory.update({
                where: { id: inventoryId },
                data: { quantity: inventory.quantity - Number(quantity) }
            })
        ]);
        res.status(201).json(projectMaterial);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error reserving material' });
    }
});
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map