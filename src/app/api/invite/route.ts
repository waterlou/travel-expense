import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    const invite = await prisma.invitation.findUnique({
      where: { code: code.toUpperCase() },
      include: { travel: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 })
    }

    if (invite.usedById) {
      return NextResponse.json({ error: 'Code already used' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    }

    // Check if user is already a member
    const existingMember = await prisma.travelMember.findFirst({
      where: {
        travelId: invite.travelId,
        userId: (session.user as any).id,
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 })
    }

    // Find an unclaimed member slot (created by admin but not yet linked to a user)
    const unclaimedMember = await prisma.travelMember.findFirst({
      where: {
        travelId: invite.travelId,
        userId: (session.user as any).id,
      },
    })

    // Create the member
    const member = await prisma.travelMember.create({
      data: {
        travelId: invite.travelId,
        userId: (session.user as any).id,
        name: session.user.name || 'Member',
        isAdmin: false,
      },
    })

    // Mark invite as used
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { usedById: (session.user as any).id },
    })

    return NextResponse.json({
      prefix: invite.travel.prefix,
      travelName: invite.travel.name,
    })
  } catch (error) {
    console.error('Join error:', error)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}
