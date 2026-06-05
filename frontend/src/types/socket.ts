export interface DrawPayload {
  boardId: string
  elementId: string
  type: string
  data: Record<string, unknown>
  createdBy: string
}

export interface CursorPayload {
  boardId: string
  userId: string
  x: number
  y: number
}

export interface ClientToServerEvents {
  'board:join': (boardId: string) => void
  'board:leave': (boardId: string) => void
  'draw:add': (payload: DrawPayload) => void
  'draw:update': (payload: DrawPayload) => void
  'draw:delete': (payload: { boardId: string; elementId: string }) => void
  'cursor:move': (payload: CursorPayload) => void
}

export interface ServerToClientEvents {
  'board:state': (elements: Record<string, unknown>[]) => void
  'draw:added': (payload: DrawPayload) => void
  'draw:updated': (payload: DrawPayload) => void
  'draw:deleted': (payload: { boardId: string; elementId: string }) => void
  'cursor:moved': (payload: CursorPayload) => void
  'room:users': (userIds: string[]) => void
  'error': (message: string) => void
}

export interface SocketData {
  userId: string
}
