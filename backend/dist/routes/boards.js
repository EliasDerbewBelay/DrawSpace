"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const users_1 = require("../lib/users");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
async function fetchBoardWithRelations(id) {
    const result = await prisma_1.prisma.board.findUnique({
        where: { id },
        include: {
            members: true,
            elements: true,
            _count: { select: { members: true } },
        },
    });
    return result;
}
// GET /api/boards
router.get('/', async (req, res) => {
    try {
        const boards = await prisma_1.prisma.board.findMany({
            where: { ownerId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { members: true } } },
        });
        res.json({ boards });
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/boards
router.post('/', async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' && req.body.name.trim()
            ? req.body.name.trim()
            : 'Untitled Board';
        const board = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.user.upsert({
                where: { clerkId: req.userId },
                create: {
                    clerkId: req.userId,
                    name: req.userId,
                    email: `${req.userId}@clerk.local`,
                },
                update: {},
            });
            const created = await tx.board.create({
                data: { name, ownerId: req.userId },
            });
            await tx.boardMember.create({
                data: { boardId: created.id, userId: req.userId, role: 'owner' },
            });
            return created;
        });
        res.status(201).json({ board });
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
function parseSaveElements(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.flatMap((item) => {
        if (!item || typeof item !== 'object')
            return [];
        const el = item;
        if (typeof el.elementId !== 'string' ||
            typeof el.type !== 'string' ||
            !el.data ||
            typeof el.data !== 'object') {
            return [];
        }
        return [
            {
                elementId: el.elementId,
                type: el.type,
                data: el.data,
                createdBy: typeof el.createdBy === 'string' ? el.createdBy : '',
                updatedAt: typeof el.updatedAt === 'number' ? el.updatedAt : Date.now(),
            },
        ];
    });
}
function toStoredElement(el) {
    return {
        elementId: el.elementId,
        type: el.type,
        data: el.data,
        createdBy: el.createdBy,
        updatedAt: el.updatedAt,
    };
}
async function assertBoardMember(boardId, userId) {
    const board = await prisma_1.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
        return { ok: false, status: 404, error: 'Board not found' };
    }
    if (board.ownerId === userId)
        return { ok: true };
    const membership = await prisma_1.prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
    });
    if (!membership) {
        return { ok: false, status: 403, error: 'You do not have access to this board' };
    }
    return { ok: true };
}
// POST /api/boards/:boardId/save
router.post('/:boardId/save', async (req, res) => {
    try {
        const boardId = req.params['boardId'];
        const access = await assertBoardMember(boardId, req.userId);
        if (!access.ok) {
            res.status(access.status).json({ error: access.error });
            return;
        }
        const elements = parseSaveElements(req.body.elements);
        const savedAt = new Date();
        await prisma_1.prisma.$transaction(async (tx) => {
            const ids = elements.map((el) => el.elementId);
            if (ids.length === 0) {
                await tx.element.deleteMany({ where: { boardId } });
            }
            else {
                await tx.element.deleteMany({
                    where: { boardId, id: { notIn: ids } },
                });
            }
            for (const el of elements) {
                await tx.element.upsert({
                    where: { id: el.elementId },
                    create: {
                        id: el.elementId,
                        boardId,
                        type: el.type,
                        data: el.data,
                        createdBy: el.createdBy || req.userId,
                        updatedAt: new Date(el.updatedAt),
                    },
                    update: {
                        type: el.type,
                        data: el.data,
                        updatedAt: new Date(el.updatedAt),
                    },
                });
            }
            await tx.boardSnapshot.create({
                data: {
                    boardId,
                    elementsJson: elements.map(toStoredElement),
                },
            });
            await tx.board.update({
                where: { id: boardId },
                data: { updatedAt: savedAt },
            });
        });
        res.json({ success: true, savedAt: savedAt.toISOString(), elementCount: elements.length });
    }
    catch {
        res.status(500).json({ error: 'Failed to save board' });
    }
});
// GET /api/boards/:boardId
router.get('/:boardId', async (req, res) => {
    try {
        const boardId = req.params['boardId'];
        const board = await fetchBoardWithRelations(boardId);
        if (!board) {
            res.status(404).json({ error: 'Board not found' });
            return;
        }
        const isMember = board.members.some((m) => m.userId === req.userId);
        if (!isMember) {
            await (0, users_1.ensureUser)(req.userId);
            await prisma_1.prisma.boardMember.create({
                data: { boardId, userId: req.userId, role: 'editor' },
            });
            const updated = await fetchBoardWithRelations(boardId);
            res.json({ board: updated });
            return;
        }
        res.json({ board });
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
function mergeBoardSettings(existing, patch) {
    const base = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? existing
        : {};
    const updates = patch && typeof patch === 'object' && !Array.isArray(patch)
        ? patch
        : {};
    return { ...base, ...updates };
}
// PATCH /api/boards/:boardId
router.patch('/:boardId', async (req, res) => {
    try {
        const boardId = req.params['boardId'];
        const board = await prisma_1.prisma.board.findUnique({ where: { id: boardId } });
        if (!board) {
            res.status(404).json({ error: 'Board not found' });
            return;
        }
        const isOwner = board.ownerId === req.userId;
        const membership = await prisma_1.prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId: req.userId } },
        });
        const isMember = isOwner || membership !== null;
        const hasName = req.body.name !== undefined;
        const hasSettings = req.body.settings !== undefined;
        if (!hasName && !hasSettings) {
            res.status(400).json({ error: 'Nothing to update' });
            return;
        }
        const data = {};
        if (hasName) {
            if (!isOwner) {
                res.status(403).json({ error: 'Only the owner can rename this board' });
                return;
            }
            const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
            if (!name) {
                res.status(400).json({ error: 'name cannot be empty' });
                return;
            }
            data.name = name;
        }
        if (hasSettings) {
            if (!isMember) {
                res.status(403).json({ error: 'You do not have access to this board' });
                return;
            }
            data.settings = mergeBoardSettings(board.settings, req.body.settings);
        }
        const updated = await prisma_1.prisma.board.update({
            where: { id: boardId },
            data,
        });
        res.json({ board: updated });
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/boards/:boardId
router.delete('/:boardId', async (req, res) => {
    try {
        const boardId = req.params['boardId'];
        const board = await prisma_1.prisma.board.findUnique({ where: { id: boardId } });
        if (!board) {
            res.status(404).json({ error: 'Board not found' });
            return;
        }
        if (board.ownerId !== req.userId) {
            res.status(403).json({ error: 'Only the owner can delete this board' });
            return;
        }
        await prisma_1.prisma.board.delete({ where: { id: boardId } });
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
