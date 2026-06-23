import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get designs by project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const designs = await prisma.design.findMany({
      where: { projectId: projectId as string },
      orderBy: { createdAt: 'desc' }
    });
    res.json(designs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching designs' });
  }
});

// Upload a new design (URLs for now, actual S3 logic later)
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, cadUrl, drawingUrl, renderUrl } = req.body;
    
    // Auto increment revision
    const existingCount = await prisma.design.count({ where: { projectId: String(projectId) } });
    
    const newDesign = await prisma.design.create({
      data: {
        projectId,
        cadUrl,
        drawingUrl,
        renderUrl,
        revisionNumber: existingCount + 1,
        status: 'pending'
      }
    });
    
    res.status(201).json(newDesign);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating design' });
  }
});

// Approve Design
router.patch('/:id/approve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'internal' or 'client'
    
    const status = type === 'client' ? 'client_approved' : 'internal_approved';
    
    const updatedDesign = await prisma.design.update({
      where: { id: id as string },
      data: { status }
    });
    
    res.json(updatedDesign);
  } catch (error) {
    res.status(500).json({ message: 'Server error approving design' });
  }
});

export default router;
