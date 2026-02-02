"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const app_1 = tslib_1.__importDefault(require("./app"));
const env_1 = require("./config/env");
const start = async () => {
    try {
        await app_1.default.listen({
            port: env_1.envConfig.PORT,
            host: '0.0.0.0',
        });
        app_1.default.log.info(`
╔════════════════════════════════════════════════════╗
║             MobiTickets Backend Started            ║
║                                                    ║
║  Environment  : ${env_1.envConfig.NODE_ENV.padEnd(38)} ║
║  Port         : ${String(env_1.envConfig.PORT).padEnd(38)} ║
║  URL          : http://localhost:${env_1.envConfig.PORT}   ║
║  Health check : http://localhost:${env_1.envConfig.PORT}/health ║
╚════════════════════════════════════════════════════╝
    `);
        if (env_1.envConfig.NODE_ENV !== 'production') {
            app_1.default.log.info('Registered routes:');
            app_1.default.printRoutes({ commonPrefix: false });
        }
    }
    catch (err) {
        app_1.default.log.error({ err }, 'Failed to start server:');
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map