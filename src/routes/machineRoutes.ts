import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get machines
router.get('/', authenticate, async (req, res) => {
  try {
    const machines = await prisma.machine.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(machines);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching machines' });
  }
});

// Add machine
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type, hourlyCost, maintenanceIntervalHours } = req.body;
    
    const newMachine = await prisma.machine.create({
      data: {
        name,
        type,
        hourlyCost: Number(hourlyCost),
        maintenanceIntervalHours: Number(maintenanceIntervalHours) || 200,
        status: 'active'
      }
    });
    
    res.status(201).json(newMachine);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating machine' });
  }
});

// Update Machine (e.g. reset maintenance hours)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, status, hourlyCost, maintenanceIntervalHours, totalRunHours } = req.body;
    
    const updated = await prisma.machine.update({
      where: { id: String(id) },
      data: {
        name, type, status, 
        hourlyCost: hourlyCost ? Number(hourlyCost) : undefined,
        maintenanceIntervalHours: maintenanceIntervalHours ? Number(maintenanceIntervalHours) : undefined,
        totalRunHours: totalRunHours !== undefined ? Number(totalRunHours) : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating machine' });
  }
});

// Delete Machine
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.machine.delete({ where: { id: String(id) } });
    res.json({ message: 'Machine deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting machine' });
  }
});

export default router;
