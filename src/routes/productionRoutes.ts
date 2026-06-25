import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get production logs
router.get('/', authenticate, async (req, res) => {
  try {
    const logs = await prisma.productionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } }, machine: { select: { name: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching production logs' });
  }
});

// Get Active Work Orders (Comprehensive List)
router.get('/work-orders', authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'work_order' },
      include: {
        machineLogs: {
          include: { machine: true }
        },
        productionLogs: true
      }
    });

    const formattedWorkOrders = projects.map(p => {
      let totalUsageTimeHours = 0;
      let earliestStart = null as Date | null;
      let latestEnd = null as Date | null;
      let machinesUsed = new Set<string>();

      p.machineLogs.forEach(log => {
        if (log.machine) machinesUsed.add(log.machine.name);
        
        const start = new Date(log.startTime);
        const end = log.endTime ? new Date(log.endTime) : new Date();
        
        if (!earliestStart || start < earliestStart) earliestStart = start;
        if (!latestEnd || end > latestEnd) latestEnd = end;

        const diffMs = end.getTime() - start.getTime();
        totalUsageTimeHours += (diffMs / (1000 * 60 * 60));
      });

      const completedLogs = p.productionLogs.filter(pl => pl.status === 'completed');
      const totalLogs = p.productionLogs.length;
      const statusText = totalLogs > 0 ? `${completedLogs.length}/${totalLogs} Stages Completed` : 'In Progress';

      return {
        id: p.id,
        projectId: p.projectId,
        clientDemand: p.requirements || p.description || 'N/A',
        machinesUsed: Array.from(machinesUsed).join(', ') || 'N/A',
        startTime: earliestStart,
        endTime: latestEnd,
        dateRange: earliestStart && latestEnd ? `${earliestStart.toLocaleDateString()} - ${latestEnd.toLocaleDateString()}` : 'N/A',
        totalUsageTime: totalUsageTimeHours.toFixed(2) + ' hours',
        status: statusText,
        progressPercentage: p.progressPercentage
      };
    });

    res.json(formattedWorkOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching active work orders' });
  }
});

// Get production logs by project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const logs = await prisma.productionLog.findMany({
      where: { projectId: String(projectId) },
      orderBy: { createdAt: 'asc' },
      include: { machine: { select: { name: true } }, worker: { select: { name: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching production logs for project' });
  }
});

// Add production log
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, stage, machineId, workerId, remarks } = req.body;
    
    const newLog = await prisma.productionLog.create({
      data: {
        projectId,
        stage,
        machineId: machineId || null,
        workerId: workerId || null,
        remarks,
        status: 'in_progress',
        startTime: new Date()
      }
    });
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating production log' });
  }
});

// Update production log status (completed)
router.patch('/:id/complete', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityProduced, remarks } = req.body;
    
    const updatedLog = await prisma.productionLog.update({
      where: { id: String(id) },
      data: {
        status: 'completed',
        endTime: new Date(),
        quantityProduced: quantityProduced ? parseFloat(quantityProduced) : undefined,
        remarks: remarks || undefined
      }
    });
    
    // Automatically update project progress
    const project = await prisma.project.findUnique({
      where: { id: updatedLog.projectId! },
      include: { productionLogs: true }
    });
    
    if (project) {
      const completedStages = project.productionLogs.filter((l: any) => l.status === 'completed').length;
      const totalStages = project.productionLogs.length || 1;
      const progressPercentage = Math.round((completedStages / totalStages) * 100);
      
      let projectStatus = project.status;
      if (progressPercentage === 100) projectStatus = 'completed';
      
      await prisma.project.update({
        where: { id: project.id },
        data: { progressPercentage, status: projectStatus }
      });
    }

    res.json(updatedLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating production log' });
  }
});

// --- MATERIAL TRACKING ENDPOINTS ---

// Submit new Material IN/OUT log
router.post('/material-log', authenticate, async (req, res) => {
  try {
    const { stage, quantityProduced, transactionType, startPhotos, workerId, vendorName } = req.body;
    const newLog = await prisma.productionLog.create({
      data: {
        stage,
        quantityProduced: quantityProduced ? parseFloat(quantityProduced) : 0,
        transactionType, // 'OUT' or 'IN'
        startPhotos, // { machine, unit, software }
        workerId: workerId || undefined,
        vendorName: vendorName || undefined,
        approvalStatus: 'pending',
        status: 'completed' // Consider it a completed discrete log entry
      }
    });
    res.status(201).json(newLog);
  } catch (error) {
    console.error("Material Log Error:", error);
    res.status(500).json({ message: 'Server error creating material log' });
  }
});

// Fetch pending approvals for Admin
router.get('/pending-approvals', authenticate, async (req, res) => {
  try {
    const pendingLogs = await prisma.productionLog.findMany({
      where: { approvalStatus: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: { select: { name: true } }
      }
    });
    res.json(pendingLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching pending approvals' });
  }
});

// Approve or Reject a material log (Assign Project if approved)

// Approve or Reject a material log (Assign Project if approved)
router.patch('/:id/approve', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, projectId } = req.body; // approvalStatus: 'approved' or 'rejected'

    const updatedLog = await prisma.productionLog.update({
      where: { id: String(id) },
      data: {
        approvalStatus,
        projectId: projectId ? String(projectId) : undefined
      }
    });
    res.json(updatedLog);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating material log approval' });
  }
});

// Fetch approved material logs for Production Management
router.get('/approved-logs', authenticate, async (req, res) => {
  try {
    const approvedLogs = await prisma.productionLog.findMany({
      where: { approvalStatus: 'approved' },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: { select: { name: true } },
        project: { select: { name: true, projectId: true } }
      }
    });
    res.json(approvedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching approved logs' });
  }
});

export default router;
