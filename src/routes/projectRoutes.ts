import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        assignedTo: { select: { name: true } },
        quotations: { select: { products: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        productionLogs: { select: { quantityProduced: true, status: true } }
      }
    });

    const enrichedProjects = projects.map(p => {
      let calculatedTotalPieces = 0;
      if (p.quotations && p.quotations.length > 0) {
        const firstQuote = p.quotations[0];
        if (firstQuote && firstQuote.products) {
          const products = firstQuote.products as any[];
          if (Array.isArray(products)) {
            calculatedTotalPieces = products.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
          }
        }
      }

      let calculatedCompletedPieces = 0;
      if (p.productionLogs && p.productionLogs.length > 0) {
        calculatedCompletedPieces = p.productionLogs
          .filter((log: any) => log.status === 'completed')
          .reduce((acc: number, log: any) => acc + (Number(log.quantityProduced) || 0), 0);
      }

      // We remove the included relations from the response to save payload size, 
      // but attach the calculated fields.
      const { quotations, productionLogs, ...projectData } = p;

      return {
        ...projectData,
        products: p.quotations?.[0]?.products || [],
        totalPieces: calculatedTotalPieces > 0 ? calculatedTotalPieces : projectData.totalPieces,
        completedPieces: calculatedCompletedPieces > 0 ? calculatedCompletedPieces : projectData.completedPieces,
        deliveryDate: projectData.deadline || projectData.deliveryDate,
        clientHandle: projectData.clientHandle || projectData.assignedTo?.name
      };
    });

    res.json(enrichedProjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Create a new project (Enquiry)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: String(id) },
      include: { 
        assignedTo: { select: { name: true } }, 
        invoices: true,
        quotations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, status, startDate, deadline, assignedToId, clientName, clientContact, clientEmail, enquirySource, location, requirements, createdAt, customerPhoto, totalPieces, completedPieces, deliveryDate, clientHandle } = req.body;
    
    // Auto-generate project ID (e.g. U-A-01) resetting per Financial Year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (April is 3)
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const fyStartDate = new Date(fyStartYear, 3, 1); // April 1st

    const count = await prisma.project.count({
      where: {
        createdAt: {
          gte: fyStartDate
        }
      }
    });
    const projectId = `U-A-${String(count + 1).padStart(2, '0')}`;

    const newProject = await prisma.project.create({
      data: {
        projectId,
        name,
        description,
        clientName,
        clientContact,
        clientEmail,
        enquirySource,
        location,
        requirements,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        status: status || 'enquiry',
        startDate: startDate ? new Date(startDate) : new Date(),
        deadline: deadline ? new Date(deadline) : null,
        assignedToId,
        customerPhoto,
        totalPieces: totalPieces ? parseInt(totalPieces) : 0,
        completedPieces: completedPieces ? parseInt(completedPieces) : 0,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        clientHandle
      }
    });
    
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating project' });
  }
});

// Update project (Status, workflow progression)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);

    const updated = await prisma.project.update({
      where: { id: String(id) },
      data: updateData
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating project' });
  }
});

// Delete project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app we might soft-delete or cascade delete. For now, hard delete.
    // Need to delete related records first or add cascade in schema
    // Since we don't have cascade in schema, we should delete related records
    await prisma.shopDrawing.deleteMany({ where: { projectId: String(id) } });
    await prisma.quotation.deleteMany({ where: { projectId: String(id) } });
    await prisma.invoice.deleteMany({ where: { projectId: String(id) } });
    await prisma.projectMaterial.deleteMany({ where: { projectId: String(id) } });
    await prisma.productionLog.deleteMany({ where: { projectId: String(id) } });
    
    await prisma.project.delete({
      where: { id: String(id) }
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting project' });
  }
});

// Get materials reserved for project
router.get('/:id/materials', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const materials = await prisma.projectMaterial.findMany({
      where: { projectId: String(id) },
      include: { inventory: true },
      orderBy: { addedAt: 'desc' }
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching project materials' });
  }
});

// Reserve material for project
router.post('/:id/materials', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryId, quantity, cost } = req.body;
    
    // Check inventory stock
    const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
    if (!inventory || inventory.quantity < quantity) {
      return res.status(400).json({ message: 'Not enough stock in inventory' });
    }

    // Deduct stock from inventory and add to project material inside a transaction
    const [projectMaterial, updatedInventory] = await prisma.$transaction([
      prisma.projectMaterial.create({
        data: {
          projectId: String(id),
          inventoryId,
          quantity: Number(quantity),
          cost: Number(cost)
        }
      }),
      prisma.inventory.update({
        where: { id: inventoryId },
        data: { quantity: inventory.quantity - Number(quantity) }
      })
    ]);
    
    res.status(201).json(projectMaterial);
  } catch (error) {
    res.status(500).json({ message: 'Server error reserving material' });
  }
});

export default router;
