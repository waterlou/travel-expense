import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isSingleUserMode } from '@/lib/single-user'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ travelId: string; inviteId: string }> }) {
  const { travelId, inviteId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isSingleUserMode()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === user.id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json()
  const invite = await prisma.invitation.update({
    where: { id: inviteId },
    data: { active: body.active === true },
  })

  return NextResponse.json({ invite })
}
