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

// Live Feed Endpoint
router.get('/live-feed', authenticate, async (req, res) => {
  try {
    const activeLogs = await prisma.machineLog.findMany({
      where: { status: 'active' },
      orderBy: { startTime: 'desc' },
      include: {
        machine: { select: { name: true, type: true } },
        project: { select: { name: true, projectId: true, requirements: true } },
        operator: { select: { name: true, staffId: true } }
      }
    });
    res.json(activeLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching live feed' });
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

// Machine Clock-In (Two-Step workflow)
router.post('/clock-in', authenticate, async (req, res) => {
  try {
    const { machineId, projectId, machinePhotoUrl, unitPhotoUrl, softwarePhotoUrl, remarks } = req.body;
    const operatorId = (req as any).user?.id;
    
    // Auto-complete any existing active machine logs for this operator
    await prisma.machineLog.updateMany({
      where: { operatorId, status: 'active' },
      data: { status: 'completed', endTime: new Date() }
    });

    const newLog = await prisma.machineLog.create({
      data: {
        machineId,
        projectId: projectId || null,
        startTime: new Date(),
        machinePhotoUrl,
        unitPhotoUrl,
        softwarePhotoUrl,
        remarks,
        operatorId,
        status: 'active'
      }
    });
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error during machine clock-in' });
  }
});

export default router;
