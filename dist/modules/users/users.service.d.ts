export declare const getProfile: (userId: string) => Promise<{
    id: string;
    email: string;
    role: import(".prisma/client").$Enums.Role;
    fullName: string | null;
    avatarUrl: string | null;
    bio: string | null;
} | null>;
export declare const updateProfile: (userId: string, data: {
    fullName?: string;
    bio?: string;
}) => Promise<{
    id: string;
    fullName: string | null;
    bio: string | null;
}>;
//# sourceMappingURL=users.service.d.ts.map