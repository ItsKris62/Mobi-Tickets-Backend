"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        fullName: zod_1.z.string().optional(),
        bio: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=users.schema.js.map