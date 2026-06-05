import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cors from 'cors'
import { verifyToken } from '@clerk/backend'
import apiRouter from './routes/index'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './types/socket'
import { registerHandlers } from './socket/handlers'
import { connectRedis, disconnectRedis, isRedisReady, redisClients } from './lib/redis'
import { prisma } from './lib/prisma'
import { assertRequiredEnv, getAllowedOrigins } from './lib/env'

assertRequiredEnv()

const app = express()
const allowedOrigins = getAllowedOrigins()

app.set('trust proxy', 1)

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

const PORT = Number(process.env.PORT ?? 4000)
const HOST = process.env.HOST ?? '0.0.0.0'

async function start(): Promise<void> {
  const redisConnected = await connectRedis()
  if (redisConnected) {
    io.adapter(createAdapter(redisClients.pub, redisClients.sub))
  }

  server.listen(PORT, HOST, () => {
    console.log(`DrawSpace backend running on ${HOST}:${PORT}`)
    console.log(`CORS origins: ${[...allowedOrigins].join(', ')}`)
    if (isRedisReady()) {
      console.log('Socket.io using Redis adapter for live state')
    }
  })
}

void start()

async function shutdown(): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await disconnectRedis()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
