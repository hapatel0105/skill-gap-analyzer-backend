import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for user operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  RESUMES: 'resumes',
  JOB_DESCRIPTIONS: 'job_descriptions',
  SKILLS: 'skills',
  SKILL_GAPS: 'skill_gaps',
  LEARNING_PATHS: 'learning_paths',
  LEARNING_RESOURCES: 'learning_resources',
  USER_SKILLS: 'user_skills',
} as const;

// Storage bucket names
export const STORAGE_BUCKETS = {
  RESUMES: 'resumes',
  AVATARS: 'avatars',
} as const;

// RLS policies (for reference)
export const RLS_POLICIES = {
  USERS: {
    SELECT: 'Users can view their own profile',
    UPDATE: 'Users can update their own profile',
    DELETE: 'Users can delete their own profile',
  },
  RESUMES: {
    SELECT: 'Users can view their own resumes',
    INSERT: 'Users can upload their own resumes',
    UPDATE: 'Users can update their own resumes',
    DELETE: 'Users can delete their own resumes',
  },
  JOB_DESCRIPTIONS: {
    SELECT: 'Users can view their own job descriptions',
    INSERT: 'Users can create their own job descriptions',
    UPDATE: 'Users can update their own job descriptions',
    DELETE: 'Users can delete their own job descriptions',
  },
} as const;