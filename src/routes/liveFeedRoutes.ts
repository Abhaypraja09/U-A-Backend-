import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get live factory feed (Machine Logs for Today)
router.get('/', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const liveFeedLogs = await prisma.machineLog.findMany({
      where: { startTime: { gte: startOfDay } },
      include: { 
        machine: true,
        operator: { select: { name: true, staffId: true, role: true, department: true } },
        project: { select: { name: true, projectId: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(liveFeedLogs);
  } catch (error) {
    console.error('Live Feed Error:', error);
    res.status(500).json({ message: 'Server error fetching live feed' });
  }
});

export default router;
