import { createHash, randomBytes } from 'node:crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export type AppUser = { id: string; name?: string | null; email?: string | null }

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Returns the plaintext key exactly once; only the sha256 hash is stored.
export async function createApiKey(name: string, userId: string): Promise<{ id: string; key: string; keyPrefix: string }> {
  const key = `te_${randomBytes(24).toString('base64url')}`
  const keyPrefix = key.slice(0, 10)
  const row = await prisma.apiKey.create({ data: { userId, name, keyHash: hashApiKey(key), keyPrefix } })
  return { id: row.id, key, keyPrefix }
}

export async function findUserByApiKey(token: string): Promise<AppUser | null> {
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(token) } })
  if (!row) return null
  await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
  return prisma.user.findUnique({ where: { id: row.userId }, select: { id: true, name: true, email: true } })
}

// Auth for every API handler: Bearer token wins and must be valid (no session
// fallback when a Bearer header is present); otherwise the session (or the
// single-user fixed identity) is used. `viaApiKey` lets key-management routes
// reject API-key-authenticated calls (an agent must not mint/revoke keys).
export async function getRequestUser(req?: NextRequest): Promise<{ user: AppUser | null; viaApiKey: boolean }> {
  const auth = req?.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return { user: await findUserByApiKey(auth.slice(7)), viaApiKey: true }
  return { user: await getSessionUser(), viaApiKey: false }
}
