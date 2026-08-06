import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { isSingleUserMode } from '@/lib/single-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isSingleUserMode()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: {
      members: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ members: travel.members })
}
