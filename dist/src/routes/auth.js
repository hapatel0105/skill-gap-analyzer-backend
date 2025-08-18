"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const supabase_1 = require("../config/supabase");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation middleware
const validateSignup = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }),
];
const validateSignin = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
];
const validateProfile = [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }),
    (0, express_validator_1.body)('currentRole').optional().trim(),
    (0, express_validator_1.body)('targetRole').optional().trim(),
    (0, express_validator_1.body)('experience').optional().isIn(['entry', 'mid', 'senior', 'lead']),
];
// Sign up
router.post('/signup', validateSignup, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new errorHandler_2.CustomError('Validation failed', 400);
    }
    const { email, password, name } = req.body;
    // Check if user already exists by trying to sign up
    // Supabase will return an error if user exists
    const { data, error } = await supabase_1.supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                role: 'user',
            },
        },
    });
    if (error) {
        if (error.message.includes('already registered')) {
            throw new errorHandler_2.CustomError('User already exists', 409);
        }
        throw new errorHandler_2.CustomError(error.message, 400);
    }
    // Create user profile in database
    if (data.user) {
        const { error: profileError } = await supabase_1.supabase
            .from('users')
            .insert({
            id: data.user.id,
            email: data.user.email,
            name,
            experience: 'entry',
            created_at: new Date().toISOString(),
        });
        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't fail the signup if profile creation fails
        }
    }
    res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name,
            },
        },
    });
}));
// Sign in
router.post('/signin', validateSignin, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new errorHandler_2.CustomError('Validation failed', 400);
    }
    const { email, password } = req.body;
    const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        throw new errorHandler_2.CustomError('Invalid credentials', 401);
    }
    res.json({
        success: true,
        message: 'Signed in successfully',
        data: {
            user: {
                id: data.user?.id,
                email: data.user?.email,
                name: data.user?.user_metadata?.name,
            },
            session: {
                access_token: data.session?.access_token,
                refresh_token: data.session?.refresh_token,
                expires_at: data.session?.expires_at,
            },
        },
    });
}));
// Sign out
router.post('/signout', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error } = await supabase_1.supabase.auth.signOut();
    if (error) {
        throw new errorHandler_2.CustomError('Sign out failed', 500);
    }
    res.json({
        success: true,
        message: 'Signed out successfully',
    });
}));
// Get current user
router.get('/me', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: { message: "Authentication removed" }
    });
}));
// Update profile
router.put('/profile', auth_1.authMiddleware, validateProfile, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new errorHandler_2.CustomError('Validation failed', 400);
    }
    const { name, currentRole, targetRole, experience } = req.body;
    const { data, error } = await supabase_1.supabase
        .from('users')
        .update({
        name,
        current_role: currentRole,
        target_role: targetRole,
        experience,
        updated_at: new Date().toISOString(),
    })
        .eq('id', req.user.id)
        .select()
        .single();
    if (error) {
        throw new errorHandler_2.CustomError('Profile update failed', 500);
    }
    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: data },
    });
}));
// Refresh token
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        throw new errorHandler_2.CustomError('Refresh token required', 400);
    }
    const { data, error } = await supabase_1.supabase.auth.refreshSession({
        refresh_token,
    });
    if (error) {
        throw new errorHandler_2.CustomError('Invalid refresh token', 401);
    }
    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            session: {
                access_token: data.session?.access_token,
                refresh_token: data.session?.refresh_token,
                expires_at: data.session?.expires_at,
            },
        },
    });
}));
// Forgot password
router.post('/forgot-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new errorHandler_2.CustomError('Email required', 400);
    }
    const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });
    if (error) {
        throw new errorHandler_2.CustomError('Password reset failed', 500);
    }
    res.json({
        success: true,
        message: 'Password reset email sent',
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map