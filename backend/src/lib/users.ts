import { createClerkClient } from '@clerk/backend'
import { Prisma } from '../generated/prisma/client'
import { prisma } from './prisma'

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

/**
 * Ensure a User row exists for a Clerk user id (FK for Board.ownerId).
 * Fetches profile from Clerk when possible so email/name stay valid.
 */
export async function ensureUser(clerkId: string): Promise<void> {
  let name = clerkId
  let email = `${clerkId}@clerk.local`
  let avatarUrl: string | undefined

  try {
    const user = await clerk.users.getUser(clerkId)
    const primary = user.emailAddresses.find(
      (entry) => entry.id === user.primaryEmailAddressId
    )
    name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      user.fullName ||
      clerkId
    if (primary?.emailAddress) {
      email = primary.emailAddress
    }
    avatarUrl = user.imageUrl ?? undefined
  } catch {
    // Clerk lookup failed — keep placeholder profile; board FK still works.
  }

  try {
    await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, name, email, avatarUrl },
      update: { name, email, avatarUrl },
    })
  } catch (err) {
    if (!isUniqueConstraintError(err)) throw err

    // Email already taken by another row — keep a clerk-scoped address.
    await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        name,
        email: `${clerkId}@clerk.local`,
        avatarUrl,
      },
      update: { name, avatarUrl },
    })
  }
}
