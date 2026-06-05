import { Router, Request, Response } from 'express'
import { isRedisReady } from '../lib/redis'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let db = false
  try {
    await prisma.$queryRaw`SELECT 1`
    db = true
  } catch {
    db = false
  }

  const ok = db
  res.status(ok ? 200 : 503).json({
    ok,
    db,
    redis: isRedisReady(),
    env: process.env.NODE_ENV ?? 'development',
  })
})

export default router
