import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { name: true } } }
    });
    res.json(projects);
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
      include: { assignedTo: { select: { name: true } } }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, status, startDate, deadline, assignedToId, clientName, clientContact, clientEmail, enquirySource, location, requirements } = req.body;
    
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
        status: status || 'enquiry',
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        assignedToId
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

export default router;
