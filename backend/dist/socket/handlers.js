"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlers = registerHandlers;
const prisma_1 = require("../lib/prisma");
const users_1 = require("../lib/users");
const liveState_1 = require("../lib/liveState");
function elementToStored(el) {
    return {
        elementId: el.id,
        type: el.type,
        data: el.data,
        createdBy: el.createdBy,
        updatedAt: el.updatedAt.getTime(),
    };
}
async function socketOnlineUsers(io, boardId) {
    const sockets = await io.in(boardId).fetchSockets();
    return [...new Set(sockets.map((s) => s.data.userId))];
}
async function broadcastOnlineUsers(io, boardId) {
    const redisUsers = await (0, liveState_1.getBoardOnlineUsers)(boardId);
    const userIds = redisUsers.length > 0 ? redisUsers : await socketOnlineUsers(io, boardId);
    io.to(boardId).emit('room:users', userIds);
}
function registerHandlers(io, socket, userId) {
    /* ─── board:join ─────────────────────────────────────────── */
    socket.on('board:join', (boardId) => {
        void (async () => {
            await socket.join(boardId);
            console.log(`${userId} joined board ${boardId}`);
            await (0, users_1.ensureUser)(userId);
            await (0, liveState_1.addBoardPresence)(boardId, userId);
            const elements = await prisma_1.prisma.element.findMany({
                where: { boardId },
                orderBy: { updatedAt: 'asc' },
            });
            socket.emit('board:state', elements.map((el) => elementToStored(el)));
            const cursors = await (0, liveState_1.getBoardCursors)(boardId);
            socket.emit('cursors:state', cursors.filter((c) => c.userId !== userId));
            await broadcastOnlineUsers(io, boardId);
        })();
    });
    /* ─── board:leave ─────────────────────────────────────────── */
    socket.on('board:leave', (boardId) => {
        void (async () => {
            await socket.leave(boardId);
            const fullyLeft = await (0, liveState_1.removeBoardPresence)(boardId, userId);
            if (fullyLeft) {
                await (0, liveState_1.clearBoardCursor)(boardId, userId);
                socket.to(boardId).emit('cursor:left', { boardId, userId });
            }
            await broadcastOnlineUsers(io, boardId);
        })();
    });
    /* ─── draw:add ────────────────────────────────────────────── */
    socket.on('draw:add', (payload) => {
        if (!payload.boardId || !payload.elementId || !payload.type || !payload.data || !payload.createdBy) {
            socket.emit('error', 'Invalid draw:add payload');
            return;
        }
        void (async () => {
            try {
                await prisma_1.prisma.element.upsert({
                    where: { id: payload.elementId },
                    create: {
                        id: payload.elementId,
                        boardId: payload.boardId,
                        type: payload.type,
                        data: payload.data,
                        createdBy: payload.createdBy,
                    },
                    update: {
                        data: payload.data,
                        updatedAt: new Date(),
                    },
                });
                socket.to(payload.boardId).emit('draw:added', payload);
                const count = await prisma_1.prisma.element.count({ where: { boardId: payload.boardId } });
                if (count > 0 && count % 20 === 0) {
                    const allElements = await prisma_1.prisma.element.findMany({ where: { boardId: payload.boardId } });
                    await prisma_1.prisma.boardSnapshot.create({
                        data: {
                            boardId: payload.boardId,
                            elementsJson: allElements.map((el) => elementToStored(el)),
                        },
                    });
                }
            }
            catch (err) {
                console.error('draw:add error', err);
                socket.emit('error', 'Failed to save element');
            }
        })();
    });
    /* ─── draw:update ─────────────────────────────────────────── */
    socket.on('draw:update', (payload) => {
        void (async () => {
            try {
                await prisma_1.prisma.element.upsert({
                    where: { id: payload.elementId },
                    create: {
                        id: payload.elementId,
                        boardId: payload.boardId,
                        type: payload.type,
                        data: payload.data,
                        createdBy: payload.createdBy,
                    },
                    update: {
                        data: payload.data,
                        updatedAt: new Date(),
                    },
                });
                socket.to(payload.boardId).emit('draw:updated', payload);
            }
            catch (err) {
                console.error('draw:update error', err);
                socket.emit('error', 'Failed to update element');
            }
        })();
    });
    /* ─── draw:delete ─────────────────────────────────────────── */
    socket.on('draw:delete', (payload) => {
        void (async () => {
            try {
                await prisma_1.prisma.element.deleteMany({ where: { id: payload.elementId } });
                socket.to(payload.boardId).emit('draw:deleted', payload);
            }
            catch (err) {
                console.error('draw:delete error', err);
                socket.emit('error', 'Failed to delete element');
            }
        })();
    });
    /* ─── cursor:move ─────────────────────────────────────────── */
    socket.on('cursor:move', (payload) => {
        void (async () => {
            await (0, liveState_1.setBoardCursor)(payload.boardId, payload.userId, payload.x, payload.y);
            socket.to(payload.boardId).emit('cursor:moved', payload);
        })();
    });
    /* ─── disconnect ──────────────────────────────────────────── */
    socket.on('disconnect', () => {
        console.log(`${userId} disconnected`);
        const rooms = [...socket.rooms].filter((r) => r !== socket.id);
        for (const boardId of rooms) {
            void (async () => {
                try {
                    const fullyLeft = await (0, liveState_1.removeBoardPresence)(boardId, userId);
                    if (fullyLeft) {
                        await (0, liveState_1.clearBoardCursor)(boardId, userId);
                        io.to(boardId).emit('cursor:left', { boardId, userId });
                    }
                    await broadcastOnlineUsers(io, boardId);
                }
                catch {
                    /* board may already be cleaned up */
                }
            })();
        }
    });
}
