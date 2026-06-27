import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const router = Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, wage, otRate, staffId } = req.body;
    
    const finalEmail = email || (staffId ? `${staffId}@unnati.com` : `${name.replace(/\s+/g, '').toLowerCase()}${Math.floor(Math.random()*1000)}@unnati.com`);

    // Check if user exists by email or staffId
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: finalEmail },
          ...(staffId ? [{ staffId }] : [])
        ]
      }
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or Staff ID' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        staffId,
        name,
        email: finalEmail,
        password: hashedPassword,
        role: role || 'employee',
        department,
        wage: wage ? parseFloat(wage) : 0,
        otRate: otRate ? parseFloat(otRate) : 0,
      },
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // emailOrStaffId can be an email or a staffId
    const { email: emailOrStaffId, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: emailOrStaffId, mode: 'insensitive' } },
          { staffId: { equals: emailOrStaffId, mode: 'insensitive' } },
          { name: { equals: emailOrStaffId, mode: 'insensitive' } }
        ]
      }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
