"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUserOrAdmin = exports.requireAdmin = exports.requireRole = exports.authMiddleware = exports.authenticate = void 0;
const supabase_1 = require("../config/supabase");
const errorHandler_1 = require("./errorHandler");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.CustomError('Access token required', 401);
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            throw new errorHandler_1.CustomError('Invalid or expired token', 401);
        }
        // Add user info to request object
        req.user = {
            id: user.id,
            email: user.email || '',
            role: user.user_metadata?.role || 'user',
        };
        next();
    }
    catch (error) {
        if (error instanceof errorHandler_1.CustomError) {
            next(error);
        }
        else {
            next(new errorHandler_1.CustomError('Authentication failed', 401));
        }
    }
};
exports.authenticate = authenticate;
// Optional auth middleware for routes that can work with or without authentication
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
            if (!error && user) {
                req.user = {
                    id: user.id,
                    email: user.email || '',
                    role: user.user_metadata?.role || 'user',
                };
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication for optional routes
        next();
    }
};
exports.authMiddleware = authMiddleware;
// Role-based access control middleware
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.CustomError('Authentication required', 401));
        }
        if (!allowedRoles.includes(req.user.role || 'user')) {
            return next(new errorHandler_1.CustomError('Insufficient permissions', 403));
        }
        next();
    };
};
exports.requireRole = requireRole;
// Admin-only middleware
exports.requireAdmin = (0, exports.requireRole)(['admin']);
// User or admin middleware
exports.requireUserOrAdmin = (0, exports.requireRole)(['user', 'admin']);
//# sourceMappingURL=auth.js.map