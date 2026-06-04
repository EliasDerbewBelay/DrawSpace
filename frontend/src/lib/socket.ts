import { io, Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/socket'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const socket: AppSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
})

export function connectSocket(token: string): void {
  socket.auth = { token }
  socket.connect()
}

export function disconnectSocket(): void {
  socket.disconnect()
}

export default socket
