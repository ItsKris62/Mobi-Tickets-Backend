"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferencesSchema = exports.addFavoriteSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
    }),
});
exports.addFavoriteSchema = zod_1.z.object({
    body: zod_1.z.object({
        eventId: zod_1.z.string().uuid(),
    }),
});
exports.preferencesSchema = zod_1.z.object({
    body: zod_1.z.object({
        notifications: zod_1.z.boolean().optional(),
        language: zod_1.z.string().optional(),
        theme: zod_1.z.enum(['light', 'dark', 'system']).optional(),
    }),
});
//# sourceMappingURL=users.schema.js.map