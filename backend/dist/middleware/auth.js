"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const backend_1 = require("@clerk/backend");
const users_1 = require("../lib/users");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = await (0, backend_1.verifyToken)(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        req.userId = payload.sub;
        await (0, users_1.ensureUser)(payload.sub);
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
