import Redis, { type RedisOptions } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

type RedisClients = {
  pub: Redis
  sub: Redis
}

const globalForRedis = globalThis as unknown as { redisClients?: RedisClients }

function isUpstash(url: string): boolean {
  return url.includes('upstash.io') || url.startsWith('rediss://')
}

function buildOptions(url: string, forSubscriber: boolean): RedisOptions {
  const upstash = isUpstash(url)

  const options: RedisOptions = {
    lazyConnect: true,
    // Socket.io subscriber must not retry every command (blocking SUBSCRIBE)
    maxRetriesPerRequest: forSubscriber ? null : upstash ? null : 3,
    retryStrategy(times) {
      if (times > 8) return null
      return Math.min(times * 250, 3000)
    },
  }

  if (upstash) {
    // Upstash endpoints often resolve via IPv6 — family: 0 enables dual-stack
    options.family = 0
    options.tls = {}
  }

  return options
}

function attachErrorHandler(client: Redis, label: string): void {
  client.on('error', (err: Error) => {
    console.error(`Redis ${label} error:`, err.message)
  })
}

function createClients(): RedisClients {
  const pub = new Redis(REDIS_URL, buildOptions(REDIS_URL, false))
  const sub = new Redis(REDIS_URL, buildOptions(REDIS_URL, true))
  attachErrorHandler(pub, 'pub')
  attachErrorHandler(sub, 'sub')
  return { pub, sub }
}

export const redisClients: RedisClients =
  globalForRedis.redisClients ?? createClients()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClients = redisClients
}

/** Primary client for reads/writes */
export const redis = redisClients.pub

let redisReady = false

export function isRedisReady(): boolean {
  return redisReady
}

export async function connectRedis(): Promise<boolean> {
  try {
    await redisClients.pub.connect()
    await redisClients.sub.connect()
    const pong = await redisClients.pub.ping()
    if (pong !== 'PONG') {
      throw new Error(`Unexpected PING response: ${pong}`)
    }
    redisReady = true
    const target = isUpstash(REDIS_URL) ? 'Upstash Redis' : 'Redis'
    console.log(`${target} connected`)
    return true
  } catch (err) {
    redisReady = false
    console.warn('Redis unavailable — live state will use in-memory fallback:', err)
    return false
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redisReady) return
  await redisClients.pub.quit()
  await redisClients.sub.quit()
  redisReady = false
}
