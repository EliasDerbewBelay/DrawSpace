import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '@clerk/backend'
import { ensureUser } from '../lib/users'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    req.userId = payload.sub
    await ensureUser(payload.sub)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
