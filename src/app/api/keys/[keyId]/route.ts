import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'

// Revocation is session-authenticated only (same guard as /api/keys).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  const { user, viaApiKey } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (viaApiKey) return NextResponse.json({ error: 'Not allowed with API key' }, { status: 403 })

  const { keyId } = await params
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId: user.id } })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id: key.id } })
  return NextResponse.json({ success: true })
}
