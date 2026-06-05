import type { CursorPayload } from '../types/socket'
import { isRedisReady, redis } from './redis'

const PRESENCE_TTL_SEC = 86_400
const CURSOR_TTL_SEC = 8

function presenceKey(boardId: string): string {
  return `board:${boardId}:presence`
}

function cursorKey(boardId: string, userId: string): string {
  return `board:${boardId}:cursor:${userId}`
}

export async function addBoardPresence(
  boardId: string,
  userId: string
): Promise<void> {
  if (!isRedisReady()) return
  const key = presenceKey(boardId)
  await redis.hincrby(key, userId, 1)
  await redis.expire(key, PRESENCE_TTL_SEC)
}

export async function removeBoardPresence(
  boardId: string,
  userId: string
): Promise<boolean> {
  if (!isRedisReady()) return true
  const key = presenceKey(boardId)
  const count = await redis.hincrby(key, userId, -1)
  if (count <= 0) {
    await redis.hdel(key, userId)
    await redis.del(cursorKey(boardId, userId))
    return true
  }
  return false
}

export async function getBoardOnlineUsers(boardId: string): Promise<string[]> {
  if (!isRedisReady()) return []
  const key = presenceKey(boardId)
  const counts = await redis.hgetall(key)
  return Object.entries(counts)
    .filter(([, count]) => parseInt(count, 10) > 0)
    .map(([userId]) => userId)
}

export async function setBoardCursor(
  boardId: string,
  userId: string,
  x: number,
  y: number
): Promise<void> {
  if (!isRedisReady()) return
  await redis.set(
    cursorKey(boardId, userId),
    JSON.stringify({ x, y }),
    'EX',
    CURSOR_TTL_SEC
  )
}

export async function getBoardCursors(boardId: string): Promise<CursorPayload[]> {
  if (!isRedisReady()) return []
  const userIds = await getBoardOnlineUsers(boardId)
  if (userIds.length === 0) return []

  const keys = userIds.map((uid) => cursorKey(boardId, uid))
  const values = await redis.mget(...keys)

  const cursors: CursorPayload[] = []
  for (let i = 0; i < userIds.length; i++) {
    const raw = values[i]
    if (!raw) continue
    try {
      const { x, y } = JSON.parse(raw) as { x: number; y: number }
      cursors.push({ boardId, userId: userIds[i], x, y })
    } catch {
      /* skip malformed cursor */
    }
  }
  return cursors
}

export async function clearBoardCursor(
  boardId: string,
  userId: string
): Promise<void> {
  if (!isRedisReady()) return
  await redis.del(cursorKey(boardId, userId))
}
