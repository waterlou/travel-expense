import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'
import { uniqueSlug, isValidCurrency, isValidDate, isValidExpensePermission } from '@/lib/utils'
import { isSingleUserMode, SINGLE_USER_ID, SINGLE_USER_NAME } from '@/lib/single-user'

export async function GET(req: NextRequest) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.travelMember.findMany({
    where: { userId: user.id },
    include: { travel: { include: { members: true } } },
    orderBy: { travel: { updatedAt: 'desc' } },
  })

  return NextResponse.json({
    travels: memberships.map(m => ({
      ...m.travel,
      members: m.travel.members.map(mem => ({
        id: mem.id,
        name: mem.name,
        isAdmin: mem.isAdmin,
      })),
      memberCount: m.travel.members.length,
    })),
  })
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, mainCurrency, currencies, startDate, endDate, expensePermission, allowMemberCreate, members } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (mainCurrency !== undefined && (typeof mainCurrency !== 'string' || !isValidCurrency(mainCurrency.toUpperCase()))) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }
    if (currencies !== undefined) {
      if (
        !Array.isArray(currencies) ||
        currencies.some((c: unknown) => typeof c !== 'string' || !isValidCurrency(c.toUpperCase()))
      ) {
        return NextResponse.json({ error: 'Invalid currencies' }, { status: 400 })
      }
      if (currencies.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 additional currencies' }, { status: 400 })
      }
    }
    if (startDate != null && startDate !== '' && (typeof startDate !== 'string' || !isValidDate(startDate))) {
      return NextResponse.json({ error: 'Invalid start date' }, { status: 400 })
    }
    if (endDate != null && endDate !== '' && (typeof endDate !== 'string' || !isValidDate(endDate))) {
      return NextResponse.json({ error: 'Invalid end date' }, { status: 400 })
    }
    if (expensePermission !== undefined && !isValidExpensePermission(expensePermission)) {
      return NextResponse.json({ error: 'expensePermission must be 1-4' }, { status: 400 })
    }

    const prefix = await uniqueSlug(name, async (slug) => {
      const existing = await prisma.travel.findUnique({ where: { prefix: slug } })
      return !!existing
    })

    const currentUserId = user.id

    const travel = await prisma.travel.create({
      data: {
        name,
        prefix,
        mainCurrency: (mainCurrency || 'USD').toUpperCase(),
        currencies: JSON.stringify((currencies || []).map((c: string) => c.toUpperCase()).filter((c: string) => c !== (mainCurrency || 'USD').toUpperCase())),
        startDate: startDate || null,
        endDate: endDate || null,
        expensePermission: expensePermission || 1,
        allowMemberCreate: allowMemberCreate === true,
        members: {
          create: isSingleUserMode()
            ? [{ userId: SINGLE_USER_ID, name: SINGLE_USER_NAME, isAdmin: true }]
            : members?.length
              ? members.map((m: { name?: string; isAdmin?: boolean }, i: number) => ({
                  userId: i === 0 ? currentUserId : null,
                  name: m.name || 'Member',
                  isAdmin: m.isAdmin || false,
                }))
              : [{
                  userId: currentUserId,
                  name: user.name || 'Admin',
                  isAdmin: true,
                }],
        },
      },
      include: { members: true },
    })

    return NextResponse.json({ travel }, { status: 201 })
  } catch (error) {
    console.error('Create travel error:', error)
    return NextResponse.json({ error: 'Failed to create travel' }, { status: 500 })
  }
}
