import { z } from 'zod';
export declare const createAlertSchema: z.ZodObject<{
    body: z.ZodObject<{
        type: z.ZodEnum<{
            user: "user";
            event: "event";
            security: "security";
            system: "system";
            payment: "payment";
        }>;
        severity: z.ZodEnum<{
            high: "high";
            medium: "medium";
            critical: "critical";
            low: "low";
        }>;
        title: z.ZodString;
        message: z.ZodString;
        source: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const listAlertsSchema: z.ZodObject<{
    querystring: z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<{
            user: "user";
            event: "event";
            security: "security";
            system: "system";
            payment: "payment";
        }>>;
        severity: z.ZodOptional<z.ZodEnum<{
            high: "high";
            medium: "medium";
            critical: "critical";
            low: "low";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            active: "active";
            resolved: "resolved";
            acknowledged: "acknowledged";
        }>>;
        page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=alerts.schema.d.ts.map