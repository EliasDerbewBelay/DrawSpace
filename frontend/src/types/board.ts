export interface BoardMember {
  id: string
  boardId: string
  userId: string
  role: string
  joinedAt: string
}

export interface Element {
  id: string
  boardId: string
  type: string
  data: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Board {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
  members: BoardMember[]
  elements: Element[]
  _count?: {
    members: number
  }
}
