import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInviteCode } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { travelId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const invites = await prisma.invitation.findMany({
    where: { travelId: travel.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invites })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { travelId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const code = generateInviteCode()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const invite = await prisma.invitation.create({
    data: { travelId: travel.id, code, expiresAt, multiUse: body.multiUse === true },
  })

  return NextResponse.json({ code: invite.code, id: invite.id }, { status: 201 })
}
