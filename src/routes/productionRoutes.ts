import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get production logs
router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.productionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } }, machine: { select: { name: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching production logs' });
  }
});

// Get production logs by project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const logs = await prisma.productionLog.findMany({
      where: { projectId: String(projectId) },
      orderBy: { createdAt: 'asc' },
      include: { machine: { select: { name: true } }, worker: { select: { name: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching production logs for project' });
  }
});

// Add production log
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, stage, machineId, workerId, remarks } = req.body;
    
    const newLog = await prisma.productionLog.create({
      data: {
        projectId,
        stage,
        machineId: machineId || null,
        workerId: workerId || null,
        remarks,
        status: 'in_progress',
        startTime: new Date()
      }
    });
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating production log' });
  }
});

// Complete production stage
router.patch('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityProduced, remarks } = req.body;
    
    const updatedLog = await prisma.productionLog.update({
      where: { id: String(id) },
      data: { 
        status: 'completed', 
        endTime: new Date(),
        quantityProduced: quantityProduced ? Number(quantityProduced) : undefined,
        remarks: remarks || undefined
      }
    });
    
    res.json(updatedLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error completing production log' });
  }
});

export default router;
