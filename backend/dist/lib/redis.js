"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.redisClients = void 0;
exports.isRedisReady = isRedisReady;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const globalForRedis = globalThis;
function isUpstash(url) {
    return url.includes('upstash.io') || url.startsWith('rediss://');
}
function buildOptions(url, forSubscriber) {
    const upstash = isUpstash(url);
    const options = {
        lazyConnect: true,
        // Socket.io subscriber must not retry every command (blocking SUBSCRIBE)
        maxRetriesPerRequest: forSubscriber ? null : upstash ? null : 3,
        retryStrategy(times) {
            if (times > 8)
                return null;
            return Math.min(times * 250, 3000);
        },
    };
    if (upstash) {
        // Upstash endpoints often resolve via IPv6 — family: 0 enables dual-stack
        options.family = 0;
        options.tls = {};
    }
    return options;
}
function attachErrorHandler(client, label) {
    client.on('error', (err) => {
        console.error(`Redis ${label} error:`, err.message);
    });
}
function createClients() {
    const pub = new ioredis_1.default(REDIS_URL, buildOptions(REDIS_URL, false));
    const sub = new ioredis_1.default(REDIS_URL, buildOptions(REDIS_URL, true));
    attachErrorHandler(pub, 'pub');
    attachErrorHandler(sub, 'sub');
    return { pub, sub };
}
exports.redisClients = globalForRedis.redisClients ?? createClients();
if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redisClients = exports.redisClients;
}
/** Primary client for reads/writes */
exports.redis = exports.redisClients.pub;
let redisReady = false;
function isRedisReady() {
    return redisReady;
}
async function connectRedis() {
    try {
        await exports.redisClients.pub.connect();
        await exports.redisClients.sub.connect();
        const pong = await exports.redisClients.pub.ping();
        if (pong !== 'PONG') {
            throw new Error(`Unexpected PING response: ${pong}`);
        }
        redisReady = true;
        const target = isUpstash(REDIS_URL) ? 'Upstash Redis' : 'Redis';
        console.log(`${target} connected`);
        return true;
    }
    catch (err) {
        redisReady = false;
        console.warn('Redis unavailable — live state will use in-memory fallback:', err);
        return false;
    }
}
async function disconnectRedis() {
    if (!redisReady)
        return;
    await exports.redisClients.pub.quit();
    await exports.redisClients.sub.quit();
    redisReady = false;
}
