import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { verifyToken } from '@clerk/backend'
import apiRouter from './routes/index'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/socket'
import { registerHandlers } from './socket/handlers'

const app = express()

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter((url): url is string => Boolean(url))
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
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
    origin: [...allowedOrigins],
    credentials: true,
  },
})

/* ─── socket auth middleware ──────────────────────────────── */
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined
  if (!token) {
    next(new Error('Authentication required'))
    return
  }
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    socket.data.userId = payload.sub
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

/* ─── connection ──────────────────────────────────────────── */
io.on('connection', (socket) => {
  const userId = socket.data.userId
  registerHandlers(io, socket, userId)
})

const PORT = process.env.PORT ?? 4000

server.listen(PORT, () => {
  console.log(`DrawSpace backend running on port ${PORT}`)
})
