import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CustomError } from './errorHandler';
import { FILE_UPLOAD } from '../shared/constants';
import { NextFunction, Request, Response } from 'express';
import express from 'express';

const UPLOAD_DIR = 'uploads/';

// Ensure uploads directory exists.
// Multer's diskStorage does not create the directory if it's missing.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check file type
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype as typeof FILE_UPLOAD.ALLOWED_TYPES[number])) {
      return cb(new CustomError(`Invalid file type '${file.mimetype}'. Allowed types: ${FILE_UPLOAD.ALLOWED_TYPES.join(', ')}`, 400));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext as typeof FILE_UPLOAD.ALLOWED_EXTENSIONS[number])) {
      return cb(new CustomError(`Invalid file extension '${ext}'. Allowed extensions: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`, 400));
    }

    // Additional security checks
    if (file.originalname.length > 255) {
      return cb(new CustomError('File name too long. Maximum 255 characters allowed.', 400));
    }

    // Check for potentially dangerous file names
    const dangerousPatterns = [/\.\.\//, /^\//, /\\/, /\0/];
    if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
      return cb(new CustomError('Invalid file name format.', 400));
    }

    cb(null, true);
  } catch (error) {
    cb(new CustomError('File validation error.', 400));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE, // 5MB
    files: 1, // Only allow 1 file per request
  }
});

// Resume upload middleware
export const uploadResume = upload.single('resume');

// Enhanced error handler
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  // Clean up any uploaded file on error
  if (req.file && fs.existsSync(req.file.path)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError);
    }
  }

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new CustomError(`File too large. Maximum size is ${Math.round(FILE_UPLOAD.MAX_SIZE / (1024 * 1024))}MB.`, 400));
      case 'LIMIT_FILE_COUNT':
        return next(new CustomError('Too many files. Only 1 file allowed.', 400));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new CustomError('Unexpected file field. Expected field name: "resume".', 400));
      case 'LIMIT_FIELD_KEY':
        return next(new CustomError('Field name too long.', 400));
      case 'LIMIT_FIELD_VALUE':
        return next(new CustomError('Field value too long.', 400));
      case 'LIMIT_FIELD_COUNT':
        return next(new CustomError('Too many fields.', 400));
      case 'LIMIT_PART_COUNT':
        return next(new CustomError('Too many parts.', 400));
      default:
        return next(new CustomError(`File upload error: ${error.message}`, 400));
    }
  }

  // Handle custom errors from fileFilter
  if (error instanceof CustomError) {
    return next(error);
  }

  if (error) {
    console.error('Upload error:', error);
    return next(new CustomError('File upload failed.', 500));
  }

  next();
};

// Enhanced file validation
export const validateUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new CustomError('No file uploaded. Please select a file.', 400));
  }

  try {
    // Validate file exists on disk
    if (!fs.existsSync(req.file.path)) {
      return next(new CustomError('Uploaded file not found.', 500));
    }

    // Validate file size matches what was reported
    const stats = fs.statSync(req.file.path);
    if (stats.size !== req.file.size) {
      return next(new CustomError('File size mismatch. Please try uploading again.', 400));
    }

    // Additional validation
    if (req.file.size > FILE_UPLOAD.MAX_SIZE) {
      return next(new CustomError(`File size exceeds limit of ${Math.round(FILE_UPLOAD.MAX_SIZE / (1024 * 1024))}MB.`, 400));
    }

    if (req.file.size === 0) {
      return next(new CustomError('Cannot upload empty file.', 400));
    }

    next();
  } catch (error) {
    console.error('File validation error:', error);
    return next(new CustomError('File validation failed.', 500));
  }
};

// Enhanced cleanup middleware
export const cleanupUploadedFile = (req: Request, res: Response, next: NextFunction) => {
  let cleaned = false;

  const cleanup = () => {
    if (cleaned || !req.file) return;
    
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        cleaned = true;
      }
    } catch (error) {
      console.error('Failed to cleanup uploaded file:', error);
    }
  };

  // Cleanup on response finish for error status codes
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      cleanup();
    }
  });

  // Cleanup on response close (client disconnection)
  res.on('close', () => {
    if (!res.writableEnded && res.statusCode >= 400) {
      cleanup();
    }
  });

  // Cleanup on uncaught errors
  res.on('error', () => {
    cleanup();
  });

  next();
};

// Utility function to manually cleanup file
export const manualCleanup = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Manual cleanup failed:', error);
  }
};

// Middleware to handle both multipart and JSON uploads
export const handleMixedUpload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'];
  
  if (contentType && contentType.includes('application/json')) {
    // Skip multer for JSON requests
    next();
  } else {
    // Use multer for multipart requests
    uploadResume(req, res, (error: any) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      validateUploadedFile(req, res, next);
    });
  }
};