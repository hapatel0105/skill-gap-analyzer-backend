"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupUploadedFile = exports.asyncHandler = exports.CustomError = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
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
        error = { message, statusCode: 404 };
    }
    // Mongoose duplicate key
    if (err.name === 'MongoError' && err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message).join(', ');
        error = { message, statusCode: 400 };
    }
    // Supabase errors
    if (err.message?.includes('JWT')) {
        error = { message: 'Invalid token', statusCode: 401 };
    }
    // File upload errors
    if (err.message?.includes('LIMIT_FILE_SIZE')) {
        error = { message: 'File too large', statusCode: 400 };
    }
    if (err.message?.includes('LIMIT_UNEXPECTED_FILE')) {
        error = { message: 'Unexpected file field', statusCode: 400 };
    }
    // AI/OpenRouter errors
    if (err.message?.includes('OpenAI') || err.message?.includes('OpenRouter')) {
        error = { message: 'AI service temporarily unavailable', statusCode: 503 };
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
exports.errorHandler = errorHandler;
// Custom error class
class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
const cleanupUploadedFile = (req, res, next) => {
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
exports.cleanupUploadedFile = cleanupUploadedFile;
//# sourceMappingURL=errorHandler.js.map