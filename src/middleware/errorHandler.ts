import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 } as AppError;
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 } as AppError;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = { message, statusCode: 400 } as AppError;
  }

  // Supabase errors
  if (err.message?.includes('JWT')) {
    error = { message: 'Invalid token', statusCode: 401 } as AppError;
  }

  // File upload errors
  if (err.message?.includes('LIMIT_FILE_SIZE')) {
    error = { message: 'File too large', statusCode: 400 } as AppError;
  }

  if (err.message?.includes('LIMIT_UNEXPECTED_FILE')) {
    error = { message: 'Unexpected file field', statusCode: 400 } as AppError;
  }

  // AI/OpenRouter errors
  if (err.message?.includes('OpenAI') || err.message?.includes('OpenRouter')) {
    error = { message: 'AI service temporarily unavailable', statusCode: 503 } as AppError;
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Custom error class
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const cleanupUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (req.file && res.statusCode >= 400) {
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });
  next();
};