export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export declare const TABLES: {
    readonly USERS: "users";
    readonly RESUMES: "resumes";
    readonly JOB_DESCRIPTIONS: "job_descriptions";
    readonly SKILLS: "skills";
    readonly SKILL_GAPS: "skill_gaps";
    readonly LEARNING_PATHS: "learning_paths";
    readonly LEARNING_RESOURCES: "learning_resources";
    readonly USER_SKILLS: "user_skills";
};
export declare const STORAGE_BUCKETS: {
    readonly RESUMES: "resumes";
    readonly AVATARS: "avatars";
};
export declare const RLS_POLICIES: {
    readonly USERS: {
        readonly SELECT: "Users can view their own profile";
        readonly UPDATE: "Users can update their own profile";
        readonly DELETE: "Users can delete their own profile";
    };
    readonly RESUMES: {
        readonly SELECT: "Users can view their own resumes";
        readonly INSERT: "Users can upload their own resumes";
        readonly UPDATE: "Users can update their own resumes";
        readonly DELETE: "Users can delete their own resumes";
    };
    readonly JOB_DESCRIPTIONS: {
        readonly SELECT: "Users can view their own job descriptions";
        readonly INSERT: "Users can create their own job descriptions";
        readonly UPDATE: "Users can update their own job descriptions";
        readonly DELETE: "Users can delete their own job descriptions";
    };
};
//# sourceMappingURL=supabase.d.ts.map