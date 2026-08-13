import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'

// One round trip for agent context: travel + members, all expenses (with payer
// and splits), and exchange rates.
export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const isMember = travel.members.some(m => m.userId === user.id)
  if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const expenses = await prisma.expense.findMany({
    where: { travelId: travel.id },
    include: { paidBy: true, splits: { include: { member: true } } },
    orderBy: { date: 'desc' },
  })
  const rates = await prisma.exchangeRate.findMany({ where: { travelId: travel.id } })
  return NextResponse.json({ travel, expenses, rates })
}
