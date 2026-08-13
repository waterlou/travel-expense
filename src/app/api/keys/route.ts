import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser, createApiKey } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'

// Key management is session-authenticated only: an agent authenticated with a
// key must not mint or list keys (these endpoints are for the interactive UI).
async function sessionOnly(req: NextRequest): Promise<
  { user: { id: string; name?: string | null; email?: string | null } } | NextResponse
> {
  const { user, viaApiKey } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (viaApiKey) return NextResponse.json({ error: 'Not allowed with API key' }, { status: 403 })
  return { user }
}

export async function GET(req: NextRequest) {
  const guard = await sessionOnly(req)
  if (guard instanceof NextResponse) return guard

  const keys = await prisma.apiKey.findMany({
    where: { userId: guard.user.id },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const guard = await sessionOnly(req)
  if (guard instanceof NextResponse) return guard

  let body: { name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (name.length > 50) return NextResponse.json({ error: 'Name too long' }, { status: 400 })

  const { id, key, keyPrefix } = await createApiKey(name, guard.user.id)
  return NextResponse.json({ id, key, keyPrefix }, { status: 201 })
}
