import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Validation middleware
const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
];

const validateSignin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const validateProfile = [
  body('name').optional().trim().isLength({ min: 2 }),
  body('currentRole').optional().trim(),
  body('targetRole').optional().trim(),
  body('experience').optional().isIn(['entry', 'mid', 'senior', 'lead']),
];

// Sign up
router.post('/signup', validateSignup, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { email, password, name } = req.body;

  // Check if user already exists by trying to sign up
  // Supabase will return an error if user exists
  const { data, error } = await supabase.auth.signUp({
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
      throw new CustomError('User already exists', 409);
    }
    throw new CustomError(error.message, 400);
  }

  // Create user profile in database
  if (data.user) {
    const { error: profileError } = await supabase
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
router.post('/signin', validateSignin, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new CustomError('Invalid credentials', 401);
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
router.post('/signout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new CustomError('Sign out failed', 500);
  }

  res.json({
    success: true,
    message: 'Signed out successfully',
  });
}));

// Get current user
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { message: "Authentication removed" }
  });
}));

// Update profile
router.put('/profile', authMiddleware, validateProfile, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { name, currentRole, targetRole, experience } = req.body;

  const { data, error } = await supabase
    .from('users')
    .update({
      name,
      current_role: currentRole,
      target_role: targetRole,
      experience,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) {
    throw new CustomError('Profile update failed', 500);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: data },
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new CustomError('Refresh token required', 400);
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error) {
    throw new CustomError('Invalid refresh token', 401);
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
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new CustomError('Email required', 400);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  if (error) {
    throw new CustomError('Password reset failed', 500);
  }

  res.json({
    success: true,
    message: 'Password reset email sent',
  });
}));

export default router;
