import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAddExpense } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isMember = travel.members.some(m => m.userId === (session.user as any).id)
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
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
    include: { members: true },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = travel.members.find(m => m.userId === (session.user as any).id)
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  if (!canAddExpense(member.isAdmin, travel.expensePermission)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { date, description, amount, currency, paidById, splitType, confirmed, splits, imageUrl } = body

    if (!date || amount == null || !paidById) {
      return NextResponse.json({ error: 'Date, amount, and payer are required' }, { status: 400 })
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
        amount: parseFloat(amount),
        currency: currency || travel.mainCurrency,
        paidById,
        splitType: splitType || 'equal',
        confirmed: confirmed !== false,
        imageUrl: imageUrl || null,
        splits: {
          create: travel.members.map(m => ({
            memberId: m.id,
            amount: splits?.[m.id] != null ? parseFloat(splits[m.id]) : null,
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
