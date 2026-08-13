import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'
import { isValidCurrency, isValidDate, isValidExpensePermission } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { user } = await getRequestUser(req)
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
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  try {
    const body = await req.json()

    // Patch semantics: only fields present in the body are updated; omitted
    // fields keep their current values. The prefix is stable across renames so
    // share links keep working.
    const data: Prisma.TravelUpdateInput = {}
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      data.name = name
    }
    if (body.mainCurrency !== undefined) {
      if (typeof body.mainCurrency !== 'string' || !isValidCurrency(body.mainCurrency.toUpperCase())) {
        return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
      }
      data.mainCurrency = body.mainCurrency.toUpperCase()
    }
    if (body.currencies !== undefined) {
      if (
        !Array.isArray(body.currencies) ||
        body.currencies.some((c: unknown) => typeof c !== 'string' || !isValidCurrency(c.toUpperCase()))
      ) {
        return NextResponse.json({ error: 'Invalid currencies' }, { status: 400 })
      }
      if (body.currencies.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 additional currencies' }, { status: 400 })
      }
      const main = (body.mainCurrency || travel.mainCurrency).toUpperCase()
      data.currencies = JSON.stringify(body.currencies.map((c: string) => c.toUpperCase()).filter((c: string) => c !== main))
    }
    if (body.startDate !== undefined) {
      if (body.startDate !== '' && (typeof body.startDate !== 'string' || !isValidDate(body.startDate))) {
        return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
      }
      data.startDate = body.startDate || null
    }
    if (body.endDate !== undefined) {
      if (body.endDate !== '' && (typeof body.endDate !== 'string' || !isValidDate(body.endDate))) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
      }
      data.endDate = body.endDate || null
    }
    if (body.expensePermission !== undefined) {
      if (!isValidExpensePermission(body.expensePermission)) {
        return NextResponse.json({ error: 'expensePermission must be 1-4' }, { status: 400 })
      }
      data.expensePermission = body.expensePermission
    }
    if (body.allowMemberCreate !== undefined) {
      if (typeof body.allowMemberCreate !== 'boolean') {
        return NextResponse.json({ error: 'allowMemberCreate must be a boolean' }, { status: 400 })
      }
      data.allowMemberCreate = body.allowMemberCreate
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.travel.update({
      where: { id: travel.id },
      data,
    })

    return NextResponse.json({ travel: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
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
  if (!member?.isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // SQLite FK cascade trips on ExpenseSplit->TravelMember; remove expenses
  // (and their splits) first, then let the travel delete cascade the rest.
  await prisma.expense.deleteMany({ where: { travelId: travel.id } })
  await prisma.travel.delete({ where: { id: travel.id } })
  return NextResponse.json({ success: true })
}
