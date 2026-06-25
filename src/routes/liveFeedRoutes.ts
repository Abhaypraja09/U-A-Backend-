import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get live factory feed (Active Machine Logs)
router.get('/', authenticate, async (req, res) => {
  try {
    const activeMachineLogs = await prisma.machineLog.findMany({
      where: { status: 'active' },
      include: { 
        machine: true,
        operator: { select: { name: true, staffId: true, role: true, department: true } },
        project: { select: { name: true, projectId: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(activeMachineLogs);
  } catch (error) {
    console.error('Live Feed Error:', error);
    res.status(500).json({ message: 'Server error fetching live feed' });
  }
});

export default router;
