import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get inventory items
router.get('/', authenticate, async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching inventory' });
  }
});

// Add new inventory item
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, jobWorkType, itemName, blockNumber, thickness, length, width, height, weight, quantity, unit, supplier, costPerUnit } = req.body;
    
    const newItem = await prisma.inventory.create({
      data: {
        type,
        jobWorkType: jobWorkType || 'company',
        itemName,
        blockNumber,
        thickness: thickness ? Number(thickness) : null,
        length: length ? Number(length) : null,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        quantity: Number(quantity),
        unit,
        supplier,
        costPerUnit: Number(costPerUnit)
      }
    });
    
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating inventory item' });
  }
});

// Update stock (in/out)
router.patch('/:id/stock', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body; // positive for IN, negative for OUT
    
    const item = await prisma.inventory.findUnique({ where: { id: String(id) } });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    const updatedItem = await prisma.inventory.update({
      where: { id: String(id) },
      data: { quantity: item.quantity + Number(quantityChange) }
    });
    
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating stock' });
  }
});

export default router;
