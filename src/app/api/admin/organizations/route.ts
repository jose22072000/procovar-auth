import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}

/**
 * GET /api/admin/organizations — every organization in the platform.
 * Service-to-service only (qb-panel admin panel, isSystemAdmin-gated upstream).
 */
export async function GET(request: Request) {
  if (!isServiceAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ organizations })
}
