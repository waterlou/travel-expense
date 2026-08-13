import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'
import { canEditExpense, canDeleteExpense, isValidCurrency, isValidDate } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string; eid: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId, eid } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expense = await prisma.expense.findFirst({
    where: { id: eid, travelId: travel.id },
    include: {
      paidBy: true,
      splits: { include: { member: true } },
    },
  })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

  return NextResponse.json({ expense })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ travelId: string; eid: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId, eid } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expense = await prisma.expense.findFirst({
    where: { id: eid, travelId: travel.id },
  })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === user.id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const isCreator = expense.paidById === member.id
  if (!canEditExpense(member.isAdmin, isCreator, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    const body = await req.json()

    if (typeof body.date !== 'string' || !isValidDate(body.date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }
    if (body.currency !== undefined && (typeof body.currency !== 'string' || !isValidCurrency(body.currency.toUpperCase()))) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }
    if (body.splitType !== undefined && body.splitType !== 'equal' && body.splitType !== 'manual') {
      return NextResponse.json({ error: 'Invalid splitType' }, { status: 400 })
    }
    if (!travel.members.some(m => m.id === body.paidById)) {
      return NextResponse.json({ error: 'Invalid payer' }, { status: 400 })
    }

    await prisma.expenseSplit.deleteMany({ where: { expenseId: expense.id } })

    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        date: body.date,
        description: body.description,
        amount: body.amount,
        currency: body.currency ? body.currency.toUpperCase() : body.currency,
        paidById: body.paidById,
        extraPayers: JSON.stringify(body.extraPayers || []),
        splitType: body.splitType,
        confirmed: body.confirmed !== false,
        imageUrl: body.imageUrl,
        splits: {
          create: (body.splitMemberIds || travel.members.map((m: any) => m.id)).map((id: string) => ({
            memberId: id,
            amount: body.splits?.[id] != null ? parseFloat(body.splits[id]) : null,
          })),
        },
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })

    return NextResponse.json({ expense: updated })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ travelId: string; eid: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId, eid } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expense = await prisma.expense.findFirst({
    where: { id: eid, travelId: travel.id },
  })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === user.id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const isCreator = expense.paidById === member.id
  if (!canDeleteExpense(member.isAdmin, isCreator, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await prisma.expense.delete({ where: { id: expense.id } })
  return NextResponse.json({ success: true })
}
