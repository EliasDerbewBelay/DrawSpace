/** Strip trailing slash so origin checks stay consistent */
function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, '')
}

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>()

  if (process.env.CLIENT_URL) {
    origins.add(normalizeOrigin(process.env.CLIENT_URL))
  }

  const extra = process.env.ALLOWED_ORIGINS
  if (extra) {
    for (const origin of extra.split(',')) {
      const trimmed = normalizeOrigin(origin.trim())
      if (trimmed) origins.add(trimmed)
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000')
    origins.add('http://127.0.0.1:3000')
  }

  return origins
}

export function assertRequiredEnv(): void {
  const required = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'CLIENT_URL'] as const
  const missing = required.filter((key) => !process.env[key]?.trim())

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    console.warn(
      'REDIS_URL is not set — live presence/cursors will use in-memory fallback only'
    )
  }
}
