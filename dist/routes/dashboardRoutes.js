"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/summary', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const totalLeads = await index_1.prisma.lead.count();
        const activeProjects = await index_1.prisma.project.count({ where: { status: 'in_progress' } });
        const invoices = await index_1.prisma.invoice.findMany({ select: { totalAmount: true, balanceAmount: true } });
        const totalRevenue = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
        const pendingInvoicesTotal = invoices.reduce((acc, curr) => acc + curr.balanceAmount, 0);
        const readyForDispatch = await index_1.prisma.crate.count({ where: { status: 'packing' } });
        // Profitability Analysis
        const laborContracts = await index_1.prisma.laborContract.findMany();
        const laborCost = laborContracts.reduce((acc, curr) => acc + curr.totalAmount, 0);
        const expenses = await index_1.prisma.expense.findMany();
        const factoryExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const electricity = await index_1.prisma.electricityLog.findMany();
        const electricityCost = electricity.reduce((acc, curr) => acc + curr.totalBill, 0);
        const netProfit = totalRevenue - (laborCost + factoryExpenses + electricityCost);
        res.json({
            totalLeads,
            activeProjects,
            totalRevenue,
            pendingInvoicesTotal,
            readyForDispatch,
            profitability: {
                laborCost,
                factoryExpenses,
                electricityCost,
                netProfit
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching dashboard summary', error: error.message });
    }
});
// A simple mock for downloading reports
router.get('/export/:type', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { type } = req.params;
        // In a real app, generate PDF/Excel using pdfmake or exceljs here and return buffer
        res.json({ message: `Export for ${type} generated successfully (Mock)` });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error exporting data' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map