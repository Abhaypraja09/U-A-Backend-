import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get Electricity Logs
router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.electricityLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching electricity logs' });
  }
});

// Add Electricity Log
router.post('/', authenticate, async (req, res) => {
  try {
    const { month, meterReading, unitsConsumed, totalBill } = req.body;
    
    const newLog = await prisma.electricityLog.create({
      data: {
        month,
        meterReading: Number(meterReading),
        unitsConsumed: Number(unitsConsumed),
        totalBill: Number(totalBill),
        paymentStatus: 'pending'
      }
    });
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating electricity log' });
  }
});

export default router;
