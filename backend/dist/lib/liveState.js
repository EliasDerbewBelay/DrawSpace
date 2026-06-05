"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBoardPresence = addBoardPresence;
exports.removeBoardPresence = removeBoardPresence;
exports.getBoardOnlineUsers = getBoardOnlineUsers;
exports.setBoardCursor = setBoardCursor;
exports.getBoardCursors = getBoardCursors;
exports.clearBoardCursor = clearBoardCursor;
const redis_1 = require("./redis");
const PRESENCE_TTL_SEC = 86400;
const CURSOR_TTL_SEC = 8;
function presenceKey(boardId) {
    return `board:${boardId}:presence`;
}
function cursorKey(boardId, userId) {
    return `board:${boardId}:cursor:${userId}`;
}
async function addBoardPresence(boardId, userId) {
    if (!(0, redis_1.isRedisReady)())
        return;
    const key = presenceKey(boardId);
    await redis_1.redis.hincrby(key, userId, 1);
    await redis_1.redis.expire(key, PRESENCE_TTL_SEC);
}
async function removeBoardPresence(boardId, userId) {
    if (!(0, redis_1.isRedisReady)())
        return true;
    const key = presenceKey(boardId);
    const count = await redis_1.redis.hincrby(key, userId, -1);
    if (count <= 0) {
        await redis_1.redis.hdel(key, userId);
        await redis_1.redis.del(cursorKey(boardId, userId));
        return true;
    }
    return false;
}
async function getBoardOnlineUsers(boardId) {
    if (!(0, redis_1.isRedisReady)())
        return [];
    const key = presenceKey(boardId);
    const counts = await redis_1.redis.hgetall(key);
    return Object.entries(counts)
        .filter(([, count]) => parseInt(count, 10) > 0)
        .map(([userId]) => userId);
}
async function setBoardCursor(boardId, userId, x, y) {
    if (!(0, redis_1.isRedisReady)())
        return;
    await redis_1.redis.set(cursorKey(boardId, userId), JSON.stringify({ x, y }), 'EX', CURSOR_TTL_SEC);
}
async function getBoardCursors(boardId) {
    if (!(0, redis_1.isRedisReady)())
        return [];
    const userIds = await getBoardOnlineUsers(boardId);
    if (userIds.length === 0)
        return [];
    const keys = userIds.map((uid) => cursorKey(boardId, uid));
    const values = await redis_1.redis.mget(...keys);
    const cursors = [];
    for (let i = 0; i < userIds.length; i++) {
        const raw = values[i];
        if (!raw)
            continue;
        try {
            const { x, y } = JSON.parse(raw);
            cursors.push({ boardId, userId: userIds[i], x, y });
        }
        catch {
            /* skip malformed cursor */
        }
    }
    return cursors;
}
async function clearBoardCursor(boardId, userId) {
    if (!(0, redis_1.isRedisReady)())
        return;
    await redis_1.redis.del(cursorKey(boardId, userId));
}
