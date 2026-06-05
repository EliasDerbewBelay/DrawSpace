"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUser = ensureUser;
const prisma_1 = require("./prisma");
/**
 * Ensure a minimal User row exists for a Clerk user id.
 * Clerk sign-up alone does not write to Postgres — this runs on first API/socket activity.
 */
async function ensureUser(clerkId) {
    await prisma_1.prisma.user.upsert({
        where: { clerkId },
        create: {
            clerkId,
            name: clerkId,
            email: `${clerkId}@clerk.local`,
        },
        update: {},
    });
}
