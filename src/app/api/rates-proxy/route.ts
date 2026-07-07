import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') || 'USD'
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}`)
    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 502 })
  }
}
