import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { travelId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const travel = await prisma.travel.findFirst({
    where: { OR: [{ id: travelId }, { prefix: travelId }] },
    include: { memberGroups: { include: { members: true } }, members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ groups: travel.memberGroups, members: travel.members })
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

  try {
    const body = await req.json()
    const { name, memberIds } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Group name required' }, { status: 400 })

    const group = await prisma.memberGroup.create({
      data: { travelId: travel.id, name },
    })

    if (memberIds?.length) {
      await prisma.travelMember.updateMany({
        where: { id: { in: memberIds }, travelId: travel.id },
        data: { groupId: group.id },
      })
    }

    const updated = await prisma.memberGroup.findUnique({
      where: { id: group.id },
      include: { members: true },
    })

    return NextResponse.json({ group: updated }, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
