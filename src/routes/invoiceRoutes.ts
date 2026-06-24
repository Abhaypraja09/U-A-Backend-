import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { projectId: true, name: true } } }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching invoices' });
  }
});

// Create Invoice
router.post('/', authenticate, async (req, res) => {
  try {
        const { projectId, totalAmount, advancePaid, dueDate, paymentMethod, paymentDate } = req.body;
    
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const balanceAmount = Number(totalAmount) - Number(advancePaid || 0);
    
    let status = 'unpaid';
    if (balanceAmount <= 0) status = 'paid';
    else if (Number(advancePaid) > 0) status = 'partial';

    const newInvoice = await prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber,
        totalAmount: Number(totalAmount),
        advancePaid: Number(advancePaid || 0),
        balanceAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        status
      }
    });
    
    res.status(201).json(newInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating invoice' });
  }
});

export default router;
