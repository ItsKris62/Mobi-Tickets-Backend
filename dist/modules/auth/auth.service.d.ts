import { RegisterInput, LoginInput, RefreshInput, WalletLoginInput, AuthResponse, UserResponse } from './auth.schema';
import { FastifyInstance } from 'fastify';
export declare const registerUser: (data: RegisterInput, fastify: FastifyInstance) => Promise<UserResponse>;
export declare const loginUser: (data: LoginInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const generateRefreshToken: (userId: string) => Promise<string>;
export declare const refreshAccessToken: (data: RefreshInput, fastify: FastifyInstance) => Promise<AuthResponse>;
export declare const walletLogin: (data: WalletLoginInput, fastify: FastifyInstance) => Promise<AuthResponse>;
//# sourceMappingURL=auth.service.d.ts.map