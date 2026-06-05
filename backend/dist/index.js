"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const cors_1 = __importDefault(require("cors"));
const backend_1 = require("@clerk/backend");
const index_1 = __importDefault(require("./routes/index"));
const handlers_1 = require("./socket/handlers");
const redis_1 = require("./lib/redis");
const prisma_1 = require("./lib/prisma");
const env_1 = require("./lib/env");
(0, env_1.assertRequiredEnv)();
const app = (0, express_1.default)();
const allowedOrigins = (0, env_1.getAllowedOrigins)();
app.set('trust proxy', 1);
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(index_1.default);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [...allowedOrigins],
        credentials: true,
    },
});
/* ─── socket auth middleware ──────────────────────────────── */
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        next(new Error('Authentication required'));
        return;
    }
    try {
        const payload = await (0, backend_1.verifyToken)(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        socket.data.userId = payload.sub;
        next();
    }
    catch {
        next(new Error('Invalid token'));
    }
});
/* ─── connection ──────────────────────────────────────────── */
io.on('connection', (socket) => {
    const userId = socket.data.userId;
    (0, handlers_1.registerHandlers)(io, socket, userId);
});
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
async function start() {
    const redisConnected = await (0, redis_1.connectRedis)();
    if (redisConnected) {
        io.adapter((0, redis_adapter_1.createAdapter)(redis_1.redisClients.pub, redis_1.redisClients.sub));
    }
    server.listen(PORT, HOST, () => {
        console.log(`DrawSpace backend running on ${HOST}:${PORT}`);
        console.log(`CORS origins: ${[...allowedOrigins].join(', ')}`);
        if ((0, redis_1.isRedisReady)()) {
            console.log('Socket.io using Redis adapter for live state');
        }
    });
}
void start();
async function shutdown() {
    await new Promise((resolve) => server.close(() => resolve()));
    await (0, redis_1.disconnectRedis)();
    await prisma_1.prisma.$disconnect();
    process.exit(0);
}
process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
