import { RegisterInput, LoginInput, RefreshInput, WalletLoginInput, ResetPasswordInput, LogoutInput, AuthResponse, UserResponse } from './auth.schema';
import { FastifyInstance } from 'fastify';
export declare const registerUser: (data: RegisterInput, _fastify: FastifyInstance) => Promise<UserResponse>;
export declare const registerAndLogin: (data: RegisterInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const loginUser: (data: LoginInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const generateRefreshToken: (userId: string) => Promise<string>;
export declare const refreshAccessToken: (data: RefreshInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const walletLogin: (data: WalletLoginInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const requestPasswordReset: (data: ResetPasswordInput) => Promise<{
    message: string;
}>;
export declare const validateToken: (userId: string) => Promise<{
    valid: boolean;
    user: any;
}>;
export declare const invalidateUserProfileCache: (userId: string) => Promise<void>;
export declare const logoutUser: (data: LogoutInput, userId: string) => Promise<{
    message: string;
}>;
//# sourceMappingURL=auth.service.d.ts.map