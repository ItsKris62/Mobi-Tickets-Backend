export declare const envConfig: {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    REDIS_URL: string;
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
    SMTP_PORT: number;
    SMTP_SECURE: boolean;
    SMTP_FROM: string;
    SMTP_HOST?: string | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
};
export type EnvConfig = typeof envConfig;
//# sourceMappingURL=env.d.ts.map