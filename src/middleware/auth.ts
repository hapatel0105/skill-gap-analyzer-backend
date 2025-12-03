import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { CustomError } from './errorHandler';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Allow OPTIONS requests to bypass auth (handled by CORS)
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new CustomError('Invalid or expired token', 401);
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
    };

    next();
  } catch (error) {
    if (error instanceof CustomError) {
      next(error);
    } else {
      next(new CustomError('Authentication failed', 401));
    }
  }
};

// Optional auth middleware for routes that can work with or without authentication
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'user',
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role || 'user')) {
      return next(new CustomError('Insufficient permissions', 403));
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// User or admin middleware
export const requireUserOrAdmin = requireRole(['user', 'admin']);