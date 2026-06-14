import { Router, Request, Response } from 'express'
import { isRedisReady } from '../lib/redis'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let db = false
  let schema = false
  try {
    await prisma.$queryRaw`SELECT 1`
    db = true
  } catch {
    db = false
  }

  if (db) {
    try {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Board'
      `
      const names = new Set(columns.map((col) => col.column_name))
      schema = names.has('settings') && names.has('ownerId')
    } catch {
      schema = false
    }
  }

  const ok = db && schema
  res.status(ok ? 200 : 503).json({
    ok,
    db,
    schema,
    redis: isRedisReady(),
    env: process.env.NODE_ENV ?? 'development',
  })
})

export default router
