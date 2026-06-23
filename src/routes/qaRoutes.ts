import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get QA records
router.get('/', authenticate, async (req, res) => {
  try {
    const records = await prisma.qA_QC.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching QA records' });
  }
});

// Create QA record
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, dimensionOk, finishOk, crackOk, remarks } = req.body;
    const inspectedBy = (req as any).user?.id;
    
    const status = (dimensionOk && finishOk && crackOk) ? 'passed' : 'failed';

    const newQA = await prisma.qA_QC.create({
      data: {
        projectId,
        dimensionOk,
        finishOk,
        crackOk,
        remarks,
        status,
        inspectedBy
      }
    });
    
    res.status(201).json(newQA);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating QA record' });
  }
});

export default router;
