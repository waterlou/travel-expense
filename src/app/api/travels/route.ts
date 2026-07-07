import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.travelMember.findMany({
    where: { userId: (session.user as any).id },
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
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, prefix, mainCurrency, currencies, startDate, endDate, expensePermission, members } = body

    if (!name?.trim() || !prefix?.trim()) {
      return NextResponse.json({ error: 'Name and prefix are required' }, { status: 400 })
    }

    const existing = await prisma.travel.findUnique({ where: { prefix } })
    if (existing) {
      return NextResponse.json({ error: 'Prefix already taken' }, { status: 400 })
    }

    if (currencies && currencies.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 additional currencies' }, { status: 400 })
    }

    const currentUserId = (session.user as any).id

    const travel = await prisma.travel.create({
      data: {
        name,
        prefix,
        mainCurrency: mainCurrency || 'USD',
        currencies: JSON.stringify(currencies || []),
        startDate: startDate || null,
        endDate: endDate || null,
        expensePermission: expensePermission || 1,
        members: {
          create: members?.length
            ? members.map((m: any, i: number) => ({
                userId: i === 0 ? currentUserId : null,
                name: m.name || 'Member',
                isAdmin: m.isAdmin || false,
              }))
            : [{
                userId: currentUserId,
                name: session.user.name || 'Admin',
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
