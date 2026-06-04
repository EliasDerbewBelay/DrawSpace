import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import apiRouter from './routes/index'
import { prisma, type Prisma } from './lib/prisma'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  DrawPayload,
  CursorPayload,
} from './types/socket'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(apiRouter)

const server = http.createServer(app)

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
})

io.on('connection', (socket) => {
  socket.on('board:join', (boardId: string) => {
    void socket.join(boardId)
    const room = io.sockets.adapter.rooms.get(boardId)
    const userIds = room ? [...room] : []
    io.to(boardId).emit('room:users', userIds)
  })

  socket.on('board:leave', (boardId: string) => {
    void socket.leave(boardId)
  })

  socket.on('draw:add', (payload: DrawPayload) => {
    void (async () => {
      try {
        await prisma.element.create({
          data: {
            id: payload.elementId,
            boardId: payload.boardId,
            type: payload.type,
            data: payload.data as Prisma.InputJsonValue,
            createdBy: payload.createdBy,
          },
        })
        socket.to(payload.boardId).emit('draw:added', payload)
      } catch {
        socket.emit('error', 'Failed to save element')
      }
    })()
  })

  socket.on('draw:update', (payload: DrawPayload) => {
    void (async () => {
      try {
        await prisma.element.update({
          where: { id: payload.elementId },
          data: { data: payload.data as Prisma.InputJsonValue },
        })
        socket.to(payload.boardId).emit('draw:updated', payload)
      } catch {
        socket.emit('error', 'Failed to update element')
      }
    })()
  })

  socket.on('draw:delete', (payload: { boardId: string; elementId: string }) => {
    void (async () => {
      try {
        await prisma.element.delete({ where: { id: payload.elementId } })
        socket.to(payload.boardId).emit('draw:deleted', payload)
      } catch {
        socket.emit('error', 'Failed to delete element')
      }
    })()
  })

  socket.on('cursor:move', (payload: CursorPayload) => {
    socket.to(payload.boardId).emit('cursor:moved', payload)
  })

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.data.userId ?? socket.id}`)
  })
})

const PORT = process.env.PORT ?? 4000

server.listen(PORT, () => {
  console.log(`DrawSpace backend running on port ${PORT}`)
})
