import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Get attendances
router.get('/attendance', authenticate, async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      orderBy: { date: 'desc' },
      include: { user: { select: { name: true, department: true } } }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
});

// Mark Attendance (Check-in / Punch In)
router.post('/attendance/checkin', authenticate, async (req, res) => {
  try {
    const { gpsLocation, photoUrl, machineId } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Check if already checked in today without checking out
    const activeSession = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: 'desc' }
    });

    if (activeSession) {
      return res.status(400).json({ message: 'You are already punched in.' });
    }

    const newRecord = await prisma.attendance.create({
      data: {
        userId,
        checkIn: new Date(),
        gpsLocation,
        photoUrl,
        machineId: machineId || null,
        status: 'present'
      }
    });
    
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating attendance' });
  }
});

// Mark Attendance (Check-out / Punch Out)
router.post('/attendance/checkout', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const activeSession = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: 'desc' }
    });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active punch-in found.' });
    }

    const updatedRecord = await prisma.attendance.update({
      where: { id: activeSession.id },
      data: { checkOut: new Date() }
    });
    
    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating attendance' });
  }
});

// Get active session for user
router.get('/attendance/active', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const activeSession = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: 'desc' },
      include: { machine: true }
    });

    res.json(activeSession || null);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching active attendance' });
  }
});

// Get staff salary calculation
router.get('/staff-salary', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'worker' },
      select: {
        id: true,
        name: true,
        department: true,
        wage: true,
        otRate: true,
        pieceRate: true,
        attendances: {
          where: { checkOut: { not: null } }
        },
        productionLogs: {
          where: { status: 'completed' }
        }
      }
    });

    const staffData = users.map(user => {
      // Basic piece rate calculation
      const totalSqFt = user.productionLogs.reduce((acc, log) => acc + (log.quantityProduced || 0), 0);
      const pieceRateEarnings = totalSqFt * (user.pieceRate || 0);
      
      // Basic time-based calculation (simplified)
      let totalHours = 0;
      user.attendances.forEach(att => {
        if (att.checkIn && att.checkOut) {
          totalHours += (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / (1000 * 60 * 60);
        }
      });
      const hourlyEarnings = totalHours * ((user.wage || 0) / 8); // Assuming wage is daily for 8 hours

      return {
        ...user,
        totalSqFt,
        totalHours: totalHours.toFixed(2),
        estimatedSalary: pieceRateEarnings > 0 ? pieceRateEarnings : hourlyEarnings
      };
    });

    res.json(staffData);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching staff salary' });
  }
});

export default router;
