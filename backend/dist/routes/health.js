"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = require("../lib/redis");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/health', async (_req, res) => {
    let db = false;
    let schema = false;
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        db = true;
    }
    catch {
        db = false;
    }
    if (db) {
        try {
            const columns = await prisma_1.prisma.$queryRaw `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Board'
      `;
            const names = new Set(columns.map((col) => col.column_name));
            schema = names.has('settings') && names.has('ownerId');
        }
        catch {
            schema = false;
        }
    }
    const ok = db && schema;
    res.status(ok ? 200 : 503).json({
        ok,
        db,
        schema,
        redis: (0, redis_1.isRedisReady)(),
        env: process.env.NODE_ENV ?? 'development',
    });
});
exports.default = router;
