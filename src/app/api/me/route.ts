import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-key'
import { appUrl } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { user } = await getRequestUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ user, skillsUrl: appUrl('/ai/SKILL.md') })
}
