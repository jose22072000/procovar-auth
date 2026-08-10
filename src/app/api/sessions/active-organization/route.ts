import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sessions/active-organization
 *
 * Service-to-service endpoint (legacy shared bearer) used by qb-panel to set the
 * active organization on a user's session. This is what makes RBAC correct for
 * the URL-driven panel: the org being viewed becomes the session's active org,
 * so `verify-session` resolves permissions for it (pages, nav, and the JWT
 * minted for qb-back all read that resolved RBAC).
 *
 * Body: { userId, sessionId?, organizationId }
 * - Verifies the user is a member of the org.
 * - Updates the given session (when sessionId is provided and belongs to the
 *   user) or all of the user's sessions otherwise.
 */
function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}

export async function POST(request: Request) {
  if (!isServiceAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId?: string; sessionId?: string; organizationId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, sessionId, organizationId } = body
  if (!userId || !organizationId) {
    return NextResponse.json({ error: 'userId and organizationId are required' }, { status: 400 })
  }

  // Only allow setting an org the user actually belongs to.
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true },
  })
  if (!member) {
    return NextResponse.json({ error: 'User is not a member of that organization' }, { status: 403 })
  }

  const where = sessionId ? { id: sessionId, userId } : { userId }
  const result = await prisma.session.updateMany({
    where,
    data: { activeOrganizationId: organizationId },
  })

  return NextResponse.json({ ok: true, updated: result.count })
}
