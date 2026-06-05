"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const globalForPrisma = globalThis;
function createPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required');
    }
    const config = { connectionString };
    const needsSsl = process.env.NODE_ENV === 'production' ||
        connectionString.includes('sslmode=require') ||
        connectionString.includes('render.com');
    if (needsSsl) {
        config.ssl = { rejectUnauthorized: false };
    }
    return config;
}
function createPrismaClient() {
    const pool = new pg_1.Pool(createPoolConfig());
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new client_1.PrismaClient({ adapter });
}
exports.prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
