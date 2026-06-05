import type { Server, Socket } from 'socket.io'
import { prisma, type Prisma } from '../lib/prisma'
import { ensureUser } from '../lib/users'
import {
  addBoardPresence,
  clearBoardCursor,
  getBoardCursors,
  getBoardOnlineUsers,
  removeBoardPresence,
  setBoardCursor,
} from '../lib/liveState'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  DrawPayload,
  CursorPayload,
} from '../types/socket'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

interface StoredElement {
  elementId: string
  type: string
  data: unknown
  createdBy: string
  updatedAt: number
}

function elementToStored(el: {
  id: string
  type: string
  data: Prisma.JsonValue
  createdBy: string
  updatedAt: Date
}): StoredElement {
  return {
    elementId: el.id,
    type: el.type,
    data: el.data,
    createdBy: el.createdBy,
    updatedAt: el.updatedAt.getTime(),
  }
}

async function socketOnlineUsers(io: AppServer, boardId: string): Promise<string[]> {
  const sockets = await io.in(boardId).fetchSockets()
  return [...new Set(sockets.map((s) => s.data.userId))]
}

async function broadcastOnlineUsers(io: AppServer, boardId: string): Promise<void> {
  const redisUsers = await getBoardOnlineUsers(boardId)
  const userIds =
    redisUsers.length > 0 ? redisUsers : await socketOnlineUsers(io, boardId)
  io.to(boardId).emit('room:users', userIds)
}

export function registerHandlers(io: AppServer, socket: AppSocket, userId: string): void {
  /* ─── board:join ─────────────────────────────────────────── */
  socket.on('board:join', (boardId) => {
    void (async () => {
      await socket.join(boardId)
      console.log(`${userId} joined board ${boardId}`)

      await ensureUser(userId)
      await addBoardPresence(boardId, userId)

      const elements = await prisma.element.findMany({
        where: { boardId },
        orderBy: { updatedAt: 'asc' },
      })
      socket.emit(
        'board:state',
        elements.map((el) => elementToStored(el) as unknown as Record<string, unknown>)
      )

      const cursors = await getBoardCursors(boardId)
      socket.emit(
        'cursors:state',
        cursors.filter((c) => c.userId !== userId)
      )

      await broadcastOnlineUsers(io, boardId)
    })()
  })

  /* ─── board:leave ─────────────────────────────────────────── */
  socket.on('board:leave', (boardId) => {
    void (async () => {
      await socket.leave(boardId)
      const fullyLeft = await removeBoardPresence(boardId, userId)
      if (fullyLeft) {
        await clearBoardCursor(boardId, userId)
        socket.to(boardId).emit('cursor:left', { boardId, userId })
      }
      await broadcastOnlineUsers(io, boardId)
    })()
  })

  /* ─── draw:add ────────────────────────────────────────────── */
  socket.on('draw:add', (payload: DrawPayload) => {
    if (!payload.boardId || !payload.elementId || !payload.type || !payload.data || !payload.createdBy) {
      socket.emit('error', 'Invalid draw:add payload')
      return
    }

    void (async () => {
      try {
        await prisma.element.upsert({
          where: { id: payload.elementId },
          create: {
            id: payload.elementId,
            boardId: payload.boardId,
            type: payload.type,
            data: payload.data as Prisma.InputJsonValue,
            createdBy: payload.createdBy,
          },
          update: {
            data: payload.data as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        })

        socket.to(payload.boardId).emit('draw:added', payload)

        const count = await prisma.element.count({ where: { boardId: payload.boardId } })
        if (count > 0 && count % 20 === 0) {
          const allElements = await prisma.element.findMany({ where: { boardId: payload.boardId } })
          await prisma.boardSnapshot.create({
            data: {
              boardId: payload.boardId,
              elementsJson: allElements.map((el) => elementToStored(el)) as unknown as Prisma.InputJsonValue,
            },
          })
        }
      } catch (err) {
        console.error('draw:add error', err)
        socket.emit('error', 'Failed to save element')
      }
    })()
  })

  /* ─── draw:update ─────────────────────────────────────────── */
  socket.on('draw:update', (payload: DrawPayload) => {
    void (async () => {
      try {
        await prisma.element.upsert({
          where: { id: payload.elementId },
          create: {
            id: payload.elementId,
            boardId: payload.boardId,
            type: payload.type,
            data: payload.data as Prisma.InputJsonValue,
            createdBy: payload.createdBy,
          },
          update: {
            data: payload.data as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        })
        socket.to(payload.boardId).emit('draw:updated', payload)
      } catch (err) {
        console.error('draw:update error', err)
        socket.emit('error', 'Failed to update element')
      }
    })()
  })

  /* ─── draw:delete ─────────────────────────────────────────── */
  socket.on('draw:delete', (payload) => {
    void (async () => {
      try {
        await prisma.element.deleteMany({ where: { id: payload.elementId } })
        socket.to(payload.boardId).emit('draw:deleted', payload)
      } catch (err) {
        console.error('draw:delete error', err)
        socket.emit('error', 'Failed to delete element')
      }
    })()
  })

  /* ─── cursor:move ─────────────────────────────────────────── */
  socket.on('cursor:move', (payload: CursorPayload) => {
    void (async () => {
      await setBoardCursor(payload.boardId, payload.userId, payload.x, payload.y)
      socket.to(payload.boardId).emit('cursor:moved', payload)
    })()
  })

  /* ─── disconnect ──────────────────────────────────────────── */
  socket.on('disconnect', () => {
    console.log(`${userId} disconnected`)
    const rooms = [...socket.rooms].filter((r) => r !== socket.id)
    for (const boardId of rooms) {
      void (async () => {
        try {
          const fullyLeft = await removeBoardPresence(boardId, userId)
          if (fullyLeft) {
            await clearBoardCursor(boardId, userId)
            io.to(boardId).emit('cursor:left', { boardId, userId })
          }
          await broadcastOnlineUsers(io, boardId)
        } catch {
          /* board may already be cleaned up */
        }
      })()
    }
  })
}
