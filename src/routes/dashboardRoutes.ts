import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.get('/summary', authenticate, async (req, res) => {
  try {
    const totalLeads = await prisma.lead.count();
    const activeProjects = await prisma.project.count({ where: { status: 'in_progress' } });
    
    const invoices = await prisma.invoice.findMany({ select: { totalAmount: true, balanceAmount: true } });
    const totalRevenue = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const pendingInvoicesTotal = invoices.reduce((acc, curr) => acc + curr.balanceAmount, 0);
    
    const readyForDispatch = await prisma.crate.count({ where: { status: 'packing' } });
    
    // Profitability Analysis
    const laborContracts = await prisma.laborContract.findMany();
    const laborCost = laborContracts.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    const expenses = await prisma.expense.findMany();
    const factoryExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    const electricity = await prisma.electricityLog.findMany();
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
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching dashboard summary', error: error.message });
  }
});

// A simple mock for downloading reports
router.get('/export/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    // In a real app, generate PDF/Excel using pdfmake or exceljs here and return buffer
    res.json({ message: `Export for ${type} generated successfully (Mock)` });
  } catch (error) {
    res.status(500).json({ message: 'Server error exporting data' });
  }
});

export default router;
