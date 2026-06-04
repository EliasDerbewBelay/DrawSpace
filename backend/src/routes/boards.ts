import { Router, Request, Response } from 'express'
import type { BoardMember, Element } from '../generated/prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

// Derive the transaction client type from the prisma singleton
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

// Explicit board shape returned by queries that include relations
interface BoardWithRelations {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  members: BoardMember[]
  elements: Element[]
  _count: { members: number }
}

const router = Router()
router.use(requireAuth)

/**
 * Ensure a minimal User record exists for a given clerkId so FK constraints
 * on Board.ownerId are satisfied. A proper profile sync happens via webhook
 * in a later phase — this keeps the schema constraints intact for Phase 2.
 */
async function ensureUser(clerkId: string): Promise<void> {
  await prisma.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      name: clerkId,
      email: `${clerkId}@clerk.local`,
    },
    update: {},
  })
}

async function fetchBoardWithRelations(id: string): Promise<BoardWithRelations | null> {
  const result = await prisma.board.findUnique({
    where: { id },
    include: {
      members: true,
      elements: true,
      _count: { select: { members: true } },
    },
  })
  return result as BoardWithRelations | null
}

// GET /api/boards
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await prisma.board.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    })
    res.json({ boards })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/boards
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const name: string =
      typeof req.body.name === 'string' && req.body.name.trim()
        ? req.body.name.trim()
        : 'Untitled Board'

    const board = await prisma.$transaction(async (tx: TxClient) => {
      await tx.user.upsert({
        where: { clerkId: req.userId },
        create: {
          clerkId: req.userId,
          name: req.userId,
          email: `${req.userId}@clerk.local`,
        },
        update: {},
      })
      const created = await tx.board.create({
        data: { name, ownerId: req.userId },
      })
      await tx.boardMember.create({
        data: { boardId: created.id, userId: req.userId, role: 'owner' },
      })
      return created
    })

    res.status(201).json({ board })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/boards/:boardId
router.get('/:boardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = req.params['boardId'] as string
    const board = await fetchBoardWithRelations(boardId)

    if (!board) {
      res.status(404).json({ error: 'Board not found' })
      return
    }

    const isMember = board.members.some((m) => m.userId === req.userId)
    if (!isMember) {
      await ensureUser(req.userId)
      await prisma.boardMember.create({
        data: { boardId, userId: req.userId, role: 'editor' },
      })
      const updated = await fetchBoardWithRelations(boardId)
      res.json({ board: updated })
      return
    }

    res.json({ board })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/boards/:boardId
router.patch('/:boardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = req.params['boardId'] as string
    const board = await prisma.board.findUnique({ where: { id: boardId } })

    if (!board) {
      res.status(404).json({ error: 'Board not found' })
      return
    }
    if (board.ownerId !== req.userId) {
      res.status(403).json({ error: 'Only the owner can rename this board' })
      return
    }

    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : ''
    if (!name) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { name },
    })
    res.json({ board: updated })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/boards/:boardId
router.delete('/:boardId', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = req.params['boardId'] as string
    const board = await prisma.board.findUnique({ where: { id: boardId } })

    if (!board) {
      res.status(404).json({ error: 'Board not found' })
      return
    }
    if (board.ownerId !== req.userId) {
      res.status(403).json({ error: 'Only the owner can delete this board' })
      return
    }

    await prisma.board.delete({ where: { id: boardId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
