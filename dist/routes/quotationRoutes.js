"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Get quotations by project
router.get('/project/:projectId', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const quotations = await index_1.prisma.quotation.findMany({
            where: { projectId: String(projectId) },
            orderBy: { createdAt: 'desc' }
        });
        res.json(quotations);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching quotations' });
    }
});
// Create Quotation
router.post('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { projectId, materialCost, cncCost, handCarvingCost, inlayCost, polishingCost, packingCost, transportCost, installationCost, marginPercentage, products } = req.body;
        // Calculate products total if available
        const productsTotal = products && Array.isArray(products)
            ? products.reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;
        const totalCost = productsTotal + Number(materialCost || 0) + Number(cncCost || 0) +
            Number(handCarvingCost || 0) + Number(inlayCost || 0) + Number(polishingCost || 0) +
            Number(packingCost || 0) + Number(transportCost || 0) + Number(installationCost || 0);
        const finalAmount = totalCost + (totalCost * (Number(marginPercentage || 0) / 100));
        const newQuotation = await index_1.prisma.quotation.create({
            data: {
                projectId,
                materialCost: Number(materialCost || 0),
                cncCost: Number(cncCost || 0),
                handCarvingCost: Number(handCarvingCost || 0),
                inlayCost: Number(inlayCost || 0),
                polishingCost: Number(polishingCost || 0),
                packingCost: Number(packingCost || 0),
                transportCost: Number(transportCost || 0),
                installationCost: Number(installationCost || 0),
                marginPercentage: Number(marginPercentage || 0),
                totalCost,
                finalAmount,
                products: products || [],
                status: 'draft'
            }
        });
        res.status(201).json(newQuotation);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating quotation' });
    }
});
exports.default = router;
//# sourceMappingURL=quotationRoutes.js.map