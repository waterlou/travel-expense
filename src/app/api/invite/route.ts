import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { code, memberId, newMember } = body

    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

    const invite = await prisma.invitation.findUnique({
      where: { code: code.toUpperCase() },
      include: { travel: true },
    })

    if (!invite) return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 })
    if (!invite.active) return NextResponse.json({ error: 'This invitation has been deactivated by the travel admin' }, { status: 400 })
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    if (!invite.multiUse && invite.usageCount >= 1) return NextResponse.json({ error: 'Code already used' }, { status: 400 })

    const currentUserId = (session.user as any).id

    // Check if user is already a member
    const existingMember = await prisma.travelMember.findFirst({
      where: { travelId: invite.travelId, userId: currentUserId },
    })
    if (existingMember) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

    // Step 1: show unclaimed members + allowNew
    if (!memberId && !newMember) {
      const unclaimedMembers = await prisma.travelMember.findMany({
        where: { travelId: invite.travelId, userId: null },
        orderBy: { id: 'asc' },
      })
      return NextResponse.json({
        step: 'choose-member',
        travelName: invite.travel.name,
        prefix: invite.travel.prefix,
        members: unclaimedMembers.map(m => ({ id: m.id, name: m.name })),
        allowNew: invite.travel.allowMemberCreate,
      })
    }

    // Step 2: create new member
    if (newMember) {
      if (!invite.travel.allowMemberCreate) {
        return NextResponse.json({ error: 'Creating new members is not allowed for this travel' }, { status: 403 })
      }
      await prisma.travelMember.create({
        data: { travelId: invite.travelId, userId: currentUserId, name: session.user.name || 'Member', isAdmin: false },
      })
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { usageCount: { increment: 1 }, active: invite.multiUse ? undefined : false },
      })
      return NextResponse.json({ prefix: invite.travel.prefix, travelName: invite.travel.name })
    }

    // Step 3: claim specific member
    const target = await prisma.travelMember.findFirst({
      where: { id: memberId, travelId: invite.travelId, userId: null },
    })
    if (!target) return NextResponse.json({ error: 'That member slot is no longer available.' }, { status: 400 })

    await prisma.travelMember.update({
      where: { id: target.id },
      data: { userId: currentUserId },
    })
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { usageCount: { increment: 1 }, active: invite.multiUse ? undefined : false },
    })

    return NextResponse.json({ prefix: invite.travel.prefix, travelName: invite.travel.name })
  } catch (error) {
    console.error('Join error:', error)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}
