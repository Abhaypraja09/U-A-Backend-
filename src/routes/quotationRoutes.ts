import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get quotations by project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const quotations = await prisma.quotation.findMany({
      where: { projectId: String(projectId) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching quotations' });
  }
});

// Create Quotation
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      projectId, marginPercentage, products, additionalCosts
    } = req.body;
    
    // Calculate products total if available
    const productsTotal = products && Array.isArray(products) 
      ? products.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      : 0;

    // Calculate additional costs total and map to standard columns for backward compatibility
    let additionalCostsList: any[] = [];
    if (Array.isArray(additionalCosts)) {
      additionalCostsList = additionalCosts;
    } else if (additionalCosts && typeof additionalCosts === 'object') {
      Object.values(additionalCosts).forEach((costs: any) => {
        if (Array.isArray(costs)) {
          additionalCostsList = additionalCostsList.concat(costs);
        }
      });
    }

    const additionalTotal = additionalCostsList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

    let matCost = 0, cCost = 0, hcCost = 0, inCost = 0, polCost = 0, packCost = 0, transCost = 0, instCost = 0;
    additionalCostsList.forEach((item: any) => {
      const name = (item.name || '').toLowerCase().trim();
      const amount = Number(item.amount || 0);
      if (name === 'material cost') matCost = amount;
      else if (name === 'cnc cost') cCost = amount;
      else if (name === 'hand carving cost') hcCost = amount;
      else if (name === 'inlay cost') inCost = amount;
      else if (name === 'polishing cost') polCost = amount;
      else if (name === 'packing cost') packCost = amount;
      else if (name === 'transport cost') transCost = amount;
      else if (name === 'installation cost') instCost = amount;
    });

    const totalCost = productsTotal + additionalTotal;
    const finalAmount = totalCost + (totalCost * (Number(marginPercentage || 0) / 100));

    const newQuotation = await prisma.quotation.create({
      data: {
        projectId,
        materialCost: matCost,
        cncCost: cCost,
        handCarvingCost: hcCost,
        inlayCost: inCost,
        polishingCost: polCost,
        packingCost: packCost,
        transportCost: transCost,
        installationCost: instCost,
        marginPercentage: Number(marginPercentage || 0),
        totalCost,
        finalAmount,
        products: products || [],
        additionalCosts: additionalCosts || {},
        status: 'draft'
      }
    });
    
    res.status(201).json(newQuotation);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating quotation' });
  }
});

// Update Quotation products
router.patch('/:id', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { products, additionalCosts } = req.body;

    const productsTotal = products && Array.isArray(products)
      ? products.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
      : 0;

    let additionalCostsList: any[] = [];
    if (Array.isArray(additionalCosts)) {
      additionalCostsList = additionalCosts;
    } else if (additionalCosts && typeof additionalCosts === 'object') {
      Object.values(additionalCosts).forEach((costs: any) => {
        if (Array.isArray(costs)) additionalCostsList = additionalCostsList.concat(costs);
      });
    }

    const additionalTotal = additionalCostsList.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    const totalCost = productsTotal + additionalTotal;

    const updated = await prisma.quotation.update({
      where: { id: String(id) },
      data: {
        products: products || [],
        ...(additionalCosts !== undefined ? { additionalCosts } : {}),
        totalCost,
        finalAmount: totalCost,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating quotation' });
  }
});

export default router;
