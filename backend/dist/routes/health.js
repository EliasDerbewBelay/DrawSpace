"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = require("../lib/redis");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    let db = false;
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        db = true;
    }
    catch {
        db = false;
    }
    const ok = db;
    res.status(ok ? 200 : 503).json({
        ok,
        db,
        redis: (0, redis_1.isRedisReady)(),
        env: process.env.NODE_ENV ?? 'development',
    });
});
exports.default = router;
