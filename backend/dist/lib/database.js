"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRemoteDatabase = isRemoteDatabase;
exports.isSupabaseDirectHost = isSupabaseDirectHost;
exports.requiresDatabaseSsl = requiresDatabaseSsl;
exports.normalizeDatabaseUrlForPrisma = normalizeDatabaseUrlForPrisma;
exports.normalizeDatabaseUrlForPg = normalizeDatabaseUrlForPg;
exports.logDatabaseConnectionHints = logDatabaseConnectionHints;
exports.createPgPoolConfig = createPgPoolConfig;
const REMOTE_DB_HOSTS = ['supabase.co', 'render.com', 'neon.tech'];
function isRemoteDatabase(url) {
    return REMOTE_DB_HOSTS.some((host) => url.includes(host));
}
function isSupabaseDirectHost(url) {
    return url.includes('db.') && url.includes('.supabase.co') && !url.includes('pooler.supabase.com');
}
function requiresDatabaseSsl(url) {
    return (isRemoteDatabase(url) ||
        process.env.NODE_ENV === 'production' ||
        url.includes('sslmode=require') ||
        url.includes('sslmode=verify-full'));
}
/**
 * Prisma CLI connection string — keep sslmode for migrate deploy.
 * The pg Pool uses `ssl: { rejectUnauthorized: false }` instead (see createPgPoolConfig).
 */
function normalizeDatabaseUrlForPrisma(url) {
    if (!requiresDatabaseSsl(url) || url.includes('sslmode=')) {
        return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sslmode=require`;
}
/** Strip sslmode from URL when pg Pool supplies SSL via config.ssl */
function normalizeDatabaseUrlForPg(url) {
    if (!url.includes('sslmode='))
        return url;
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    const qs = parsed.searchParams.toString();
    return qs ? `${parsed.toString()}?${qs}` : parsed.toString().replace(/\?$/, '');
}
function logDatabaseConnectionHints(url) {
    if (isSupabaseDirectHost(url)) {
        console.warn('Supabase direct host (db.*.supabase.co) is often IPv6-only and may fail on Windows. ' +
            'Use the Session pooler URI from Supabase dashboard (aws-*-REGION.pooler.supabase.com:5432).');
    }
}
function createPgPoolConfig() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
        throw new Error('DATABASE_URL is required');
    }
    logDatabaseConnectionHints(raw);
    const config = {
        connectionString: normalizeDatabaseUrlForPg(raw),
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
    };
    if (requiresDatabaseSsl(raw)) {
        config.ssl = { rejectUnauthorized: false };
    }
    return config;
}
