import type { Server, Socket } from 'socket.io'
import { prisma, type Prisma } from '../lib/prisma'
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

async function roomUserIds(boardId: string): Promise<string[]> {
  const members = await prisma.boardMember.findMany({ where: { boardId } })
  return members.map((m) => m.userId)
}

export function registerHandlers(io: AppServer, socket: AppSocket, userId: string): void {
  /* ─── board:join ─────────────────────────────────────────── */
  socket.on('board:join', (boardId) => {
    void (async () => {
      await socket.join(boardId)
      console.log(`${userId} joined board ${boardId}`)

      // Send board state — prefer latest snapshot, fall back to live elements
      const snap = await prisma.boardSnapshot.findFirst({
        where: { boardId },
        orderBy: { createdAt: 'desc' },
      })

      if (snap) {
        socket.emit('board:state', snap.elementsJson as Record<string, unknown>[])
      } else {
        const elements = await prisma.element.findMany({ where: { boardId } })
        socket.emit(
          'board:state',
          elements.map((el) => elementToStored(el) as unknown as Record<string, unknown>)
        )
      }

      // Broadcast updated member list
      const userIds = await roomUserIds(boardId)
      io.to(boardId).emit('room:users', userIds)
    })()
  })

  /* ─── board:leave ─────────────────────────────────────────── */
  socket.on('board:leave', (boardId) => {
    void (async () => {
      await socket.leave(boardId)
      const userIds = await roomUserIds(boardId)
      io.to(boardId).emit('room:users', userIds)
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

        // Create a snapshot every 20 elements
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
        // Upsert so an element that was never persisted gets created here
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
        // deleteMany never throws when the record doesn't exist (unlike delete)
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
    socket.to(payload.boardId).emit('cursor:moved', payload)
  })

  /* ─── disconnect ──────────────────────────────────────────── */
  socket.on('disconnect', () => {
    console.log(`${userId} disconnected`)
    const rooms = [...socket.rooms].filter((r) => r !== socket.id)
    for (const boardId of rooms) {
      void (async () => {
        try {
          const userIds = await roomUserIds(boardId)
          io.to(boardId).emit('room:users', userIds)
        } catch {
          // ignore — board may already be cleaned up
        }
      })()
    }
  })
}
