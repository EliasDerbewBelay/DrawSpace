import { Pool, type PoolConfig } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '../generated/prisma/client'

export type { Prisma }

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const config: PoolConfig = { connectionString }

  const needsSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('render.com')

  if (needsSsl) {
    config.ssl = { rejectUnauthorized: false }
  }

  return config
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool(createPoolConfig())
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
