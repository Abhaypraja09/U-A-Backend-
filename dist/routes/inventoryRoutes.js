"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get inventory items
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const inventory = await index_1.prisma.inventory.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(inventory);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching inventory' });
    }
});
// Add new inventory item
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { type, jobWorkType, itemName, blockNumber, thickness, length, width, height, weight, quantity, unit, supplier, costPerUnit } = req.body;
        const newItem = await index_1.prisma.inventory.create({
            data: {
                type,
                jobWorkType: jobWorkType || 'company',
                itemName,
                blockNumber,
                thickness: thickness ? Number(thickness) : null,
                length: length ? Number(length) : null,
                width: width ? Number(width) : null,
                height: height ? Number(height) : null,
                weight: weight ? Number(weight) : null,
                quantity: Number(quantity),
                unit,
                supplier,
                costPerUnit: Number(costPerUnit)
            }
        });
        res.status(201).json(newItem);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating inventory item' });
    }
});
// Update stock (in/out)
router.patch('/:id/stock', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityChange } = req.body; // positive for IN, negative for OUT
        const item = await index_1.prisma.inventory.findUnique({ where: { id: String(id) } });
        if (!item)
            return res.status(404).json({ message: 'Item not found' });
        const updatedItem = await index_1.prisma.inventory.update({
            where: { id: String(id) },
            data: { quantity: item.quantity + Number(quantityChange) }
        });
        res.json(updatedItem);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error updating stock' });
    }
});
exports.default = router;
//# sourceMappingURL=inventoryRoutes.js.map