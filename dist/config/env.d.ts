export declare const envConfig: {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    QSTASH_TOKEN: string;
    QSTASH_CURRENT_SIGNING_KEY: string;
    QSTASH_NEXT_SIGNING_KEY: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_ACCESS_EXPIRATION: string;
    JWT_REFRESH_EXPIRATION: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    CLOUDINARY_UPLOAD_PRESET: string;
    PORT: number;
    RATE_LIMIT_MAX: number;
    RATE_LIMIT_WINDOW_MS: number;
    CORS_ORIGIN: string;
    CORS_CREDENTIALS: boolean;
    RESEND_API_KEY: string;
    EMAIL_FROM: string;
    WEBHOOK_BASE_URL?: string | undefined;
};
export type EnvConfig = typeof envConfig;
//# sourceMappingURL=env.d.ts.map