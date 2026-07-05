import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import prisma from '@truf-gaming/database';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, phone, role, fullName } = req.body;
    
    if (!email || !password || !fullName) {
      throw new AppError(400, 'VALIDATION_001', 'Email, password, and full name are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      throw new AppError(409, 'AUTH_002', 'User with this email or phone already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and profile in a transaction
    const userRole = role === 'OWNER' ? 'OWNER' : 'CUSTOMER';
    
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          password: hashedPassword,
          role: userRole,
        },
      });

      if (userRole === 'CUSTOMER') {
        await tx.customerProfile.create({
          data: {
            userId: newUser.id,
            fullName,
          }
        });
      } else if (userRole === 'OWNER') {
        await tx.ownerProfile.create({
          data: {
            userId: newUser.id,
            fullName,
            businessName: `${fullName}'s Business`, // Default, to be updated in KYC
          }
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user: { id: user.id, email: user.email, role: user.role } }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'VALIDATION_001', 'Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, 'AUTH_001', 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new AppError(401, 'AUTH_001', 'Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      }
    });
  } catch (error) {
    next(error);
  }
};
