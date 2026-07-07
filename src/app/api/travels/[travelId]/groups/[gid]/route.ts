import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ travelId: string; gid: string }> }) {
  const { travelId, gid } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  try {
    const body = await req.json()
    const { name, memberIds } = body

    // Remove all members from this group first
    await prisma.travelMember.updateMany({
      where: { groupId: gid, travelId: travel.id },
      data: { groupId: null },
    })

    // Update group name
    await prisma.memberGroup.update({
      where: { id: gid },
      data: { name: name || undefined },
    })

    // Assign new members
    if (memberIds?.length) {
      await prisma.travelMember.updateMany({
        where: { id: { in: memberIds }, travelId: travel.id },
        data: { groupId: gid },
      })
    }

    const updated = await prisma.memberGroup.findUnique({
      where: { id: gid },
      include: { members: true },
    })

    return NextResponse.json({ group: updated })
  } catch (error) {
    console.error('Update group error:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ travelId: string; gid: string }> }) {
  const { travelId, gid } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // Remove group from members
  await prisma.travelMember.updateMany({
    where: { groupId: gid, travelId: travel.id },
    data: { groupId: null },
  })

  await prisma.memberGroup.delete({ where: { id: gid } })
  return NextResponse.json({ success: true })
}
