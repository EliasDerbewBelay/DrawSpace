import { prisma } from './prisma'

/**
 * Ensure a minimal User row exists for a Clerk user id.
 * Clerk sign-up alone does not write to Postgres — this runs on first API/socket activity.
 */
export async function ensureUser(clerkId: string): Promise<void> {
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
