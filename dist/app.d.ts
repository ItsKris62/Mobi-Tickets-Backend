import { FastifyInstance } from 'fastify';
declare const fastify: FastifyInstance;
export declare const sendSSENotification: (userId: string, data: Record<string, unknown>) => void;
export declare const broadcastSSENotification: (data: Record<string, unknown>) => void;
export default fastify;
//# sourceMappingURL=app.d.ts.map