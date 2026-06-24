import express from 'express';
import { prisma } from '../index';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const units = await prisma.unitCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching units' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    // Check if exists
    const existing = await prisma.unitCategory.findUnique({ where: { name } });
    if (existing) {
      return res.json(existing);
    }

    const unit = await prisma.unitCategory.create({
      data: { name }
    });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating unit' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.unitCategory.delete({
      where: { id: String(id) }
    });
    res.json({ message: 'Unit deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting unit' });
  }
});

export default router;
