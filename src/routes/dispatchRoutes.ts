import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get dispatches
router.get('/', authenticate, async (req, res) => {
  try {
    const dispatches = await prisma.dispatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } }, crates: true }
    });
    res.json(dispatches);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching dispatches' });
  }
});

// Create Dispatch
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, vehicleNumber, driverDetails, lrNumber } = req.body;
    
    const newDispatch = await prisma.dispatch.create({
      data: {
        projectId,
        vehicleNumber,
        driverDetails,
        lrNumber,
        status: 'in_transit'
      }
    });
    
    res.status(201).json(newDispatch);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating dispatch' });
  }
});

export default router;
