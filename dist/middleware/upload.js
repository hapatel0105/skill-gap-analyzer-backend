"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMixedUpload = exports.manualCleanup = exports.cleanupUploadedFile = exports.validateUploadedFile = exports.handleUploadError = exports.uploadResume = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("./errorHandler");
const constants_1 = require("../src/shared/constants");
const UPLOAD_DIR = 'uploads/';
// Ensure uploads directory exists.
// Multer's diskStorage does not create the directory if it's missing.
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
// File filter function
const fileFilter = (req, file, cb) => {
    try {
        // Check file type
        if (!constants_1.FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
            return cb(new errorHandler_1.CustomError(`Invalid file type '${file.mimetype}'. Allowed types: ${constants_1.FILE_UPLOAD.ALLOWED_TYPES.join(', ')}`, 400));
        }
        // Check file extension
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!constants_1.FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new errorHandler_1.CustomError(`Invalid file extension '${ext}'. Allowed extensions: ${constants_1.FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`, 400));
        }
        // Additional security checks
        if (file.originalname.length > 255) {
            return cb(new errorHandler_1.CustomError('File name too long. Maximum 255 characters allowed.', 400));
        }
        // Check for potentially dangerous file names
        const dangerousPatterns = [/\.\.\//, /^\//, /\\/, /\0/];
        if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
            return cb(new errorHandler_1.CustomError('Invalid file name format.', 400));
        }
        cb(null, true);
    }
    catch (error) {
        cb(new errorHandler_1.CustomError('File validation error.', 400));
    }
};
// Configure multer
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: constants_1.FILE_UPLOAD.MAX_SIZE, // 5MB
        files: 1, // Only allow 1 file per request
    }
});
// Resume upload middleware
exports.uploadResume = exports.upload.single('resume');
// Enhanced error handler
const handleUploadError = (error, req, res, next) => {
    // Clean up any uploaded file on error
    if (req.file && fs_1.default.existsSync(req.file.path)) {
        try {
            fs_1.default.unlinkSync(req.file.path);
        }
        catch (cleanupError) {
            console.error('Failed to cleanup uploaded file:', cleanupError);
        }
    }
    if (error instanceof multer_1.default.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return next(new errorHandler_1.CustomError(`File too large. Maximum size is ${Math.round(constants_1.FILE_UPLOAD.MAX_SIZE / (1024 * 1024))}MB.`, 400));
            case 'LIMIT_FILE_COUNT':
                return next(new errorHandler_1.CustomError('Too many files. Only 1 file allowed.', 400));
            case 'LIMIT_UNEXPECTED_FILE':
                return next(new errorHandler_1.CustomError('Unexpected file field. Expected field name: "resume".', 400));
            case 'LIMIT_FIELD_KEY':
                return next(new errorHandler_1.CustomError('Field name too long.', 400));
            case 'LIMIT_FIELD_VALUE':
                return next(new errorHandler_1.CustomError('Field value too long.', 400));
            case 'LIMIT_FIELD_COUNT':
                return next(new errorHandler_1.CustomError('Too many fields.', 400));
            case 'LIMIT_PART_COUNT':
                return next(new errorHandler_1.CustomError('Too many parts.', 400));
            default:
                return next(new errorHandler_1.CustomError(`File upload error: ${error.message}`, 400));
        }
    }
    // Handle custom errors from fileFilter
    if (error instanceof errorHandler_1.CustomError) {
        return next(error);
    }
    if (error) {
        console.error('Upload error:', error);
        return next(new errorHandler_1.CustomError('File upload failed.', 500));
    }
    next();
};
exports.handleUploadError = handleUploadError;
// Enhanced file validation
const validateUploadedFile = (req, res, next) => {
    if (!req.file) {
        return next(new errorHandler_1.CustomError('No file uploaded. Please select a file.', 400));
    }
    try {
        // Validate file exists on disk
        if (!fs_1.default.existsSync(req.file.path)) {
            return next(new errorHandler_1.CustomError('Uploaded file not found.', 500));
        }
        // Validate file size matches what was reported
        const stats = fs_1.default.statSync(req.file.path);
        if (stats.size !== req.file.size) {
            return next(new errorHandler_1.CustomError('File size mismatch. Please try uploading again.', 400));
        }
        // Additional validation
        if (req.file.size > constants_1.FILE_UPLOAD.MAX_SIZE) {
            return next(new errorHandler_1.CustomError(`File size exceeds limit of ${Math.round(constants_1.FILE_UPLOAD.MAX_SIZE / (1024 * 1024))}MB.`, 400));
        }
        if (req.file.size === 0) {
            return next(new errorHandler_1.CustomError('Cannot upload empty file.', 400));
        }
        next();
    }
    catch (error) {
        console.error('File validation error:', error);
        return next(new errorHandler_1.CustomError('File validation failed.', 500));
    }
};
exports.validateUploadedFile = validateUploadedFile;
// Enhanced cleanup middleware
const cleanupUploadedFile = (req, res, next) => {
    let cleaned = false;
    const cleanup = () => {
        if (cleaned || !req.file)
            return;
        try {
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
                cleaned = true;
            }
        }
        catch (error) {
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
exports.cleanupUploadedFile = cleanupUploadedFile;
// Utility function to manually cleanup file
const manualCleanup = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Manual cleanup failed:', error);
    }
};
exports.manualCleanup = manualCleanup;
// Middleware to handle both multipart and JSON uploads
const handleMixedUpload = (req, res, next) => {
    const contentType = req.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
        // Skip multer for JSON requests
        next();
    }
    else {
        // Use multer for multipart requests
        (0, exports.uploadResume)(req, res, (error) => {
            if (error) {
                return (0, exports.handleUploadError)(error, req, res, next);
            }
            (0, exports.validateUploadedFile)(req, res, next);
        });
    }
};
exports.handleMixedUpload = handleMixedUpload;
//# sourceMappingURL=upload.js.map