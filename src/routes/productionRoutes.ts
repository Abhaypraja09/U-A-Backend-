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
    const { projectId, stage, machineId, workerId, remarks, quantityProduced, transactionType, productId, productName } = req.body;
    
    const newLog = await prisma.productionLog.create({
      data: {
        projectId,
        stage,
        machineId: machineId || null,
        workerId: workerId || null,
        remarks,
        quantityProduced: Number(quantityProduced) || 0,
        transactionType,
        productId,
        productName,
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

// Fetch all active/unreturned OUT logs (transactionType: 'OUT', approvalStatus: 'approved', isReturned: false/null)
router.get('/active-out-logs', authenticate, async (req, res) => {
  try {
    const allApprovedOutLogs = await prisma.productionLog.findMany({
      where: {
        transactionType: 'OUT',
        approvalStatus: 'approved'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: { select: { name: true, staffId: true } },
        project: { select: { name: true, projectId: true } }
      }
    });

    const activeOutLogs = allApprovedOutLogs.filter(log => log.isReturned !== true);
    res.json(activeOutLogs);
  } catch (error) {
    console.error("Error fetching active OUT logs:", error);
    res.status(500).json({ message: 'Server error fetching active OUT logs' });
  }
});

// Submit new Material IN/OUT log
router.post('/material-log', authenticate, async (req, res) => {
  try {
    const { stage, quantityProduced, transactionType, startPhotos, workerId, vendorName, parentLogId } = req.body;
    
    let projectId = undefined;
    if (parentLogId) {
      const parentLog = await prisma.productionLog.findUnique({
        where: { id: parentLogId }
      });
      if (parentLog && parentLog.projectId) {
        projectId = parentLog.projectId;
      }
    }

    const newLog = await prisma.productionLog.create({
      data: {
        projectId,
        stage,
        quantityProduced: quantityProduced ? parseFloat(quantityProduced) : 0,
        transactionType, // 'OUT' or 'IN'
        startPhotos, // { machine, unit, software }
        workerId: workerId || undefined,
        vendorName: vendorName || undefined,
        parentLogId: parentLogId || undefined,
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
    const { approvalStatus, projectId, splits } = req.body; // approvalStatus: 'approved' or 'rejected'

    const originalLog = await prisma.productionLog.findUnique({ where: { id: String(id) } });
    if (!originalLog) return res.status(404).json({ message: 'Log not found' });

    let updatedLog;

    if (splits && splits.length > 0 && approvalStatus === 'approved') {
      const totalSplitQty = splits.reduce((acc: number, s: any) => acc + Number(s.qty), 0);
      const remainingQty = (originalLog.quantityProduced || 0) - totalSplitQty;
      
      const { id: _id, createdAt, updatedAt, ...restLogData } = originalLog;

      if (remainingQty > 0) {
        // Partial approval: Keep original log pending with remainder, create new logs for all splits
        updatedLog = await prisma.productionLog.update({
          where: { id: String(id) },
          data: { quantityProduced: remainingQty } // stays pending
        });
        
        for (const split of splits) {
          await prisma.productionLog.create({
            data: {
              ...restLogData,
              approvalStatus: 'approved',
              projectId: String(split.projectId),
              productId: split.productId ? String(split.productId) : undefined,
              productName: split.productName ? String(split.productName) : undefined,
              quantityProduced: Number(split.qty)
            }
          });
        }
      } else {
        // Full approval
        const firstSplit = splits[0];
        
        updatedLog = await prisma.productionLog.update({
          where: { id: String(id) },
          data: {
            approvalStatus,
            projectId: String(firstSplit.projectId),
            productId: firstSplit.productId ? String(firstSplit.productId) : undefined,
            productName: firstSplit.productName ? String(firstSplit.productName) : undefined,
            quantityProduced: Number(firstSplit.qty)
          }
        });
        
        for (let i = 1; i < splits.length; i++) {
          const split = splits[i];
          await prisma.productionLog.create({
            data: {
              ...restLogData,
              approvalStatus: 'approved',
              projectId: String(split.projectId),
              productId: split.productId ? String(split.productId) : undefined,
              productName: split.productName ? String(split.productName) : undefined,
              quantityProduced: Number(split.qty)
            }
          });
        }
      }

      // If this is an IN log, apply the returns to pending OUT logs (FIFO)
      if (originalLog.transactionType === 'IN') {
        for (const split of splits) {
          let remainingToReturn = Number(split.qty);
          
          const pendingOutLogs = await prisma.productionLog.findMany({
            where: {
              transactionType: 'OUT',
              approvalStatus: 'approved',
              projectId: String(split.projectId),
              productId: split.productId ? String(split.productId) : undefined
            },
            orderBy: { createdAt: 'asc' }
          });
          
          for (const outLog of pendingOutLogs) {
            if (remainingToReturn <= 0) break;
            
            const qtyProduced = outLog.quantityProduced || 0;
            const returnedQty = outLog.returnedQty || 0;
            const pendingQty = qtyProduced - returnedQty;
            
            if (pendingQty > 0) {
              const returnAmount = Math.min(pendingQty, remainingToReturn);
              await prisma.productionLog.update({
                where: { id: outLog.id },
                data: {
                  returnedQty: returnedQty + returnAmount,
                  isReturned: (returnedQty + returnAmount) >= qtyProduced
                }
              });
              remainingToReturn -= returnAmount;
            }
          }
        }
      }
    } else {
      updatedLog = await prisma.productionLog.update({
        where: { id: String(id) },
        data: {
          approvalStatus,
          projectId: projectId ? String(projectId) : undefined
        }
      });
    }

    if (approvalStatus === 'approved' && updatedLog.transactionType === 'IN' && updatedLog.parentLogId) {
      await prisma.productionLog.update({
        where: { id: updatedLog.parentLogId },
        data: { isReturned: true }
      });
    }

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
        project: { select: { name: true, projectId: true, clientName: true } }
      }
    });
    res.json(approvedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching approved logs' });
  }
});

// Update returnedQty for partial/full returns on OUT material logs
router.patch('/:id/return', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { returnedQty, returnDate } = req.body;

    const log = await prisma.productionLog.findUnique({ where: { id: String(id) } });
    if (!log) return res.status(404).json({ message: 'Log not found' });

    const prevReturned = (log as any).returnedQty || 0;
    const newReturnedQty = prevReturned + Number(returnedQty || 0);
    const isFullyReturned = newReturnedQty >= (log.quantityProduced || 0);

    const updated = await prisma.productionLog.update({
      where: { id: String(id) },
      data: {
        returnedQty: newReturnedQty,
        isReturned: isFullyReturned,
        returnDate: returnDate ? new Date(returnDate) : new Date()
      } as any
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error recording material return' });
  }
});

// Edit material log
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { quantityProduced, returnedQty, stage } = req.body;
    const updated = await prisma.productionLog.update({
      where: { id: req.params.id as string },
      data: {
        quantityProduced: quantityProduced ? Number(quantityProduced) : undefined,
        returnedQty: returnedQty !== undefined ? Number(returnedQty) : undefined,
        stage: stage ? String(stage) : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error editing material log' });
  }
});

// Delete material log
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.productionLog.delete({
      where: { id: req.params.id as string }
    });
    res.json({ message: 'Material log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting material log' });
  }
});

export default router;
