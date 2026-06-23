import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get Machine Logs
router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.machineLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { machine: { select: { name: true } }, project: { select: { name: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching machine logs' });
  }
});

// Create Machine Log
router.post('/', authenticate, async (req, res) => {
  try {
    const { machineId, projectId, startTime, downtime, remarks } = req.body;
    const operatorId = (req as any).user?.id;
    
    const newLog = await prisma.machineLog.create({
      data: {
        machineId,
        projectId: projectId || null,
        startTime: new Date(startTime),
        downtime: Number(downtime || 0),
        remarks,
        operatorId
      }
    });
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating machine log' });
  }
});

export default router;
