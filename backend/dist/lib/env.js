"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllowedOrigins = getAllowedOrigins;
exports.assertRequiredEnv = assertRequiredEnv;
/** Strip trailing slash so origin checks stay consistent */
function normalizeOrigin(url) {
    return url.replace(/\/$/, '');
}
/** Comma-separated origins, e.g. http://localhost:3000,https://app.example.com */
function parseOrigins(value) {
    if (!value?.trim())
        return [];
    return value
        .split(',')
        .map((origin) => normalizeOrigin(origin.trim()))
        .filter(Boolean);
}
function getAllowedOrigins() {
    const origins = new Set();
    for (const origin of parseOrigins(process.env.CLIENT_URL)) {
        origins.add(origin);
    }
    for (const origin of parseOrigins(process.env.ALLOWED_ORIGINS)) {
        origins.add(origin);
    }
    if (process.env.NODE_ENV !== 'production') {
        origins.add('http://localhost:3000');
        origins.add('http://127.0.0.1:3000');
    }
    return origins;
}
function assertRequiredEnv() {
    const required = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'CLIENT_URL'];
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
        console.warn('REDIS_URL is not set — live presence/cursors will use in-memory fallback only');
    }
}
