import 'dotenv/config'
import { defineConfig } from 'prisma/config'

function normalizeDatabaseUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL is required')
  }
  const remote =
    url.includes('supabase.co') ||
    url.includes('render.com') ||
    url.includes('neon.tech')
  if ((remote || process.env.NODE_ENV === 'production') && !url.includes('sslmode=')) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}sslmode=require`
  }
  return url
}

const migrationUrl = normalizeDatabaseUrl(
  process.env.DIRECT_URL ?? process.env.DATABASE_URL
)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
})
