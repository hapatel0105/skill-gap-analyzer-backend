export interface User {
    id: string;
    email: string;
    name: string;
    jobRole?: string;
    targetRole?: string;
    experience: 'entry' | 'mid' | 'senior' | 'lead';
    createdAt: Date;
}
export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}
//# sourceMappingURL=auth.d.ts.map