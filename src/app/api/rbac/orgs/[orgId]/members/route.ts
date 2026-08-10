import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'

type Params = { params: Promise<{ orgId: string }> }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]; const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}
async function gate(request: Request, orgId: string, perm: string) {
  if (isServiceAuth(request)) return { ok: true as const }
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const rbac = await resolveRbac(session.user.id, orgId)
  if (!can(rbac, perm)) return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const }
}

export async function GET(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'member.read')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const members = await prisma.member.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      memberRoles: { include: { role: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id, user: m.user, legacyRole: m.role,
      roles: m.memberRoles.map((mr) => ({
        id: mr.role.id, name: mr.role.name,
        scopeAllProperties: mr.scopeAllProperties,
        propertyIds: Array.isArray(mr.propertyIds) ? mr.propertyIds : [],
      })),
    })),
  })
}

export async function DELETE(request: Request, { params }: Params) {
  const { orgId } = await params
  // memberId passed as ?memberId= for this collection-level DELETE
  const memberId = new URL(request.url).searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  const g = await gate(request, orgId, 'member.remove')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })
  // Scope the delete to the org so a member from another org can't be removed (IDOR).
  const deleted = await prisma.member.deleteMany({ where: { id: memberId, organizationId: orgId } })
  if (deleted.count === 0) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
