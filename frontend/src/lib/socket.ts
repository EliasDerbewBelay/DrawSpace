import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket'],
    })
  }
  return socket
}

export async function connectSocket(getToken: () => Promise<string | null>): Promise<void> {
  const sock = getSocket()
  if (sock.connected) return
  const token = await getToken()
  if (!token) throw new Error('No auth token')
  sock.auth = { token }
  sock.connect()
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
