"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RLS_POLICIES = exports.STORAGE_BUCKETS = exports.TABLES = exports.supabaseAdmin = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}
// Client for user operations (uses anon key)
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Admin client for server-side operations (uses service role key)
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// Database table names
exports.TABLES = {
    USERS: 'users',
    RESUMES: 'resumes',
    JOB_DESCRIPTIONS: 'job_descriptions',
    SKILLS: 'skills',
    SKILL_GAPS: 'skill_gaps',
    LEARNING_PATHS: 'learning_paths',
    LEARNING_RESOURCES: 'learning_resources',
    USER_SKILLS: 'user_skills',
};
// Storage bucket names
exports.STORAGE_BUCKETS = {
    RESUMES: 'resumes',
    AVATARS: 'avatars',
};
// RLS policies (for reference)
exports.RLS_POLICIES = {
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
};
//# sourceMappingURL=supabase.js.map