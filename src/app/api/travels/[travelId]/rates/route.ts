import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'
import { isValidCurrency } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { travelId } = await params
  const travel = await prisma.travel.findFirst({
    where: {
      OR: [{ id: travelId }, { prefix: travelId }],
    },
  })
  if (!travel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rates = await prisma.exchangeRate.findMany({
    where: { travelId: travel.id },
  })

  return NextResponse.json({ rates })
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
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  try {
    const body = await req.json()
    const { fromCurrency, rate } = body

    if (!fromCurrency || rate == null) {
      return NextResponse.json({ error: 'Currency and rate required' }, { status: 400 })
    }
    if (typeof fromCurrency !== 'string' || !isValidCurrency(fromCurrency.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }
    if (fromCurrency.toUpperCase() === travel.mainCurrency) {
      return NextResponse.json({ error: 'Cannot set a rate for the main currency' }, { status: 400 })
    }
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: 'Rate must be a positive number' }, { status: 400 })
    }

    const exchangeRate = await prisma.exchangeRate.upsert({
      where: {
        travelId_fromCurrency_toCurrency: {
          travelId: travel.id,
          fromCurrency: fromCurrency.toUpperCase(),
          toCurrency: travel.mainCurrency,
        },
      },
      update: { rate },
      create: {
        travelId: travel.id,
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: travel.mainCurrency,
        rate,
      },
    })

    return NextResponse.json({ rate: exchangeRate })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update rate' }, { status: 500 })
  }
}
