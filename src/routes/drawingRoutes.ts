import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get drawings for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const drawings = await prisma.shopDrawing.findMany({
      where: { projectId },
      include: { approvals: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(drawings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

// Add new drawing
router.post('/', async (req, res) => {
  try {
    const { projectId, title, type, fileUrl, comments } = req.body;
    
    // Check if drawing with same title exists to increment version
    const existing = await prisma.shopDrawing.findFirst({
      where: { projectId, title },
      orderBy: { version: 'desc' }
    });

    const version = existing ? existing.version + 1 : 1;

    const drawing = await prisma.shopDrawing.create({
      data: {
        projectId,
        title,
        type,
        fileUrl,
        comments,
        version
      }
    });
    res.status(201).json(drawing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload drawing' });
  }
});

// Approve/Reject drawing
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, status, notes } = req.body; // status: Approved, Rejected, Changes Requested

    const drawing = await prisma.shopDrawing.findUnique({ where: { id } });
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });

    // Update drawing status
    const updatedDrawing = await prisma.shopDrawing.update({
      where: { id },
      data: { status }
    });

    // Create Approval record
    const approval = await prisma.approvalRecord.create({
      data: {
        projectId: drawing.projectId,
        shopDrawingId: id,
        approvedBy,
        status,
        notes
      }
    });

    res.json({ drawing: updatedDrawing, approval });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

export default router;
