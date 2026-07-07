import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditExpense, canDeleteExpense } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string; eid: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const isCreator = expense.paidById === member.id
  if (!canEditExpense(member.isAdmin, isCreator, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    const body = await req.json()

    await prisma.expenseSplit.deleteMany({ where: { expenseId: expense.id } })

    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        date: body.date,
        description: body.description,
        amount: parseFloat(body.amount),
        currency: body.currency,
        paidById: body.paidById,
        splitType: body.splitType,
        confirmed: body.confirmed !== false,
        imageUrl: body.imageUrl,
        splits: {
          create: travel.members.map(m => ({
            memberId: m.id,
            amount: body.splits?.[m.id] != null ? parseFloat(body.splits[m.id]) : null,
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
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const isCreator = expense.paidById === member.id
  if (!canDeleteExpense(member.isAdmin, isCreator, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await prisma.expense.delete({ where: { id: expense.id } })
  return NextResponse.json({ success: true })
}
