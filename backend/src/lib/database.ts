import type { PoolConfig } from 'pg'

const REMOTE_DB_HOSTS = ['supabase.co', 'render.com', 'neon.tech']

export function isRemoteDatabase(url: string): boolean {
  return REMOTE_DB_HOSTS.some((host) => url.includes(host))
}

export function isSupabaseDirectHost(url: string): boolean {
  return url.includes('db.') && url.includes('.supabase.co') && !url.includes('pooler.supabase.com')
}

export function requiresDatabaseSsl(url: string): boolean {
  return (
    isRemoteDatabase(url) ||
    process.env.NODE_ENV === 'production' ||
    url.includes('sslmode=require') ||
    url.includes('sslmode=verify-full')
  )
}

/**
 * Prisma CLI connection string — keep sslmode for migrate deploy.
 * The pg Pool uses `ssl: { rejectUnauthorized: false }` instead (see createPgPoolConfig).
 */
export function normalizeDatabaseUrlForPrisma(url: string): string {
  if (!requiresDatabaseSsl(url) || url.includes('sslmode=')) {
    return url
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}sslmode=require`
}

/** Strip sslmode from URL when pg Pool supplies SSL via config.ssl */
export function normalizeDatabaseUrlForPg(url: string): string {
  if (!url.includes('sslmode=')) return url
  const parsed = new URL(url)
  parsed.searchParams.delete('sslmode')
  const qs = parsed.searchParams.toString()
  return qs ? `${parsed.toString()}?${qs}` : parsed.toString().replace(/\?$/, '')
}

export function logDatabaseConnectionHints(url: string): void {
  if (isSupabaseDirectHost(url)) {
    console.warn(
      'Supabase direct host (db.*.supabase.co) is often IPv6-only and may fail on Windows. ' +
        'Use the Session pooler URI from Supabase dashboard (aws-*-REGION.pooler.supabase.com:5432).'
    )
  }
}

export function createPgPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL is required')
  }

  logDatabaseConnectionHints(raw)

  const config: PoolConfig = {
    connectionString: normalizeDatabaseUrlForPg(raw),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  }

  if (requiresDatabaseSsl(raw)) {
    config.ssl = { rejectUnauthorized: false }
  }

  return config
}
