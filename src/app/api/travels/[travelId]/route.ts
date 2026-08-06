import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [
        { id: travelId },
        { prefix: travelId },
      ],
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

  return NextResponse.json({ travel })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === user.id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  try {
    const body = await req.json()
    const slug = body.name
      ? await uniqueSlug(body.name, async (s) => {
          const existing = await prisma.travel.findFirst({ where: { prefix: s, id: { not: travel.id } } })
          return !!existing
        })
      : travel.prefix

    const updated = await prisma.travel.update({
      where: { id: travel.id },
      data: {
        name: body.name,
        prefix: slug,
        mainCurrency: body.mainCurrency,
        currencies: body.currencies
          ? JSON.stringify(body.currencies.filter((c: string) => c !== body.mainCurrency))
          : undefined,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        expensePermission: body.expensePermission,
        allowMemberCreate: body.allowMemberCreate === true,
      },
    })

    return NextResponse.json({ travel: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === user.id)
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // SQLite FK cascade trips on ExpenseSplit->TravelMember; remove expenses
  // (and their splits) first, then let the travel delete cascade the rest.
  await prisma.expense.deleteMany({ where: { travelId: travel.id } })
  await prisma.travel.delete({ where: { id: travel.id } })
  return NextResponse.json({ success: true })
}
