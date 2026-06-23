import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get Labor Contracts
router.get('/', authenticate, async (req, res) => {
  try {
    const contracts = await prisma.laborContract.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } }
    });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching labor contracts' });
  }
});

// Create Labor Contract
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, contractorName, jobType, rate, totalAmount } = req.body;
    
    const newContract = await prisma.laborContract.create({
      data: {
        projectId,
        contractorName,
        jobType,
        rate: Number(rate),
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        status: 'in_progress'
      }
    });
    
    res.status(201).json(newContract);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating labor contract' });
  }
});

export default router;
