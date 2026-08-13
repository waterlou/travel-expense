import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'
import { canAddExpense, isValidCurrency, isValidDate } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMember = travel.members.some(m => m.userId === user.id)
  if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const expenses = await prisma.expense.findMany({
    where: { travelId: travel.id },
    include: {
      paidBy: true,
      splits: { include: { member: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ expenses })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { user } = await getRequestUser(req)
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
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  if (!canAddExpense(member.isAdmin, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { date, description, amount, currency, paidById, extraPayers, splitType, splitMemberIds, confirmed, splits, imageUrl } = body

    if (!date || amount == null || !paidById) {
      return NextResponse.json({ error: 'Date, amount, and payer are required' }, { status: 400 })
    }
    if (typeof date !== 'string' || !isValidDate(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    if (currency !== undefined && (typeof currency !== 'string' || !isValidCurrency(currency.toUpperCase()))) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }
    if (splitType !== undefined && splitType !== 'equal' && splitType !== 'manual') {
      return NextResponse.json({ error: 'Invalid splitType' }, { status: 400 })
    }

    const memberIds = travel.members.map(m => m.id)
    if (!memberIds.includes(paidById)) {
      return NextResponse.json({ error: 'Invalid payer' }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        travelId: travel.id,
        date,
        description,
        amount,
        currency: (currency || travel.mainCurrency).toUpperCase(),
        paidById,
        extraPayers: JSON.stringify(extraPayers || []),
        splitType: splitType || 'equal',
        confirmed: confirmed !== false,
        imageUrl: imageUrl || null,
        splits: {
          create: (splitMemberIds || travel.members.map((m: any) => m.id)).map((id: string) => ({
            memberId: id,
            amount: splits?.[id] != null ? parseFloat(splits[id]) : null,
          })),
        },
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
