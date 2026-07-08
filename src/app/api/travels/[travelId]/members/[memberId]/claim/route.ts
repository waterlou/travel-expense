import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ travelId: string; memberId: string }> }) {
  const { travelId, memberId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const targetMember = travel.members.find(m => m.id === memberId)
  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!targetMember.userId) return NextResponse.json({ error: 'Member is not claimed' }, { status: 400 })

  await prisma.travelMember.update({
    where: { id: memberId },
    data: { userId: null },
  })

  return NextResponse.json({ success: true })
}
