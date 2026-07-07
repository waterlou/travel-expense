import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ travelId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  try {
    const body = await req.json()
    const { fromCurrency, rate } = body

    if (!fromCurrency || rate == null) {
      return NextResponse.json({ error: 'Currency and rate required' }, { status: 400 })
    }

    const exchangeRate = await prisma.exchangeRate.upsert({
      where: {
        travelId_fromCurrency_toCurrency: {
          travelId: travel.id,
          fromCurrency,
          toCurrency: travel.mainCurrency,
        },
      },
      update: { rate: parseFloat(rate) },
      create: {
        travelId: travel.id,
        fromCurrency,
        toCurrency: travel.mainCurrency,
        rate: parseFloat(rate),
      },
    })

    return NextResponse.json({ rate: exchangeRate })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update rate' }, { status: 500 })
  }
}
