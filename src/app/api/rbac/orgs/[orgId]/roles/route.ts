import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'
import { ungrantablePermissionKeys } from '@/rbac/grantable'
import type { ResolvedRbac } from '@/rbac/types'

type Params = { params: Promise<{ orgId: string }> }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}

/**
 * Returns the actor's resolved rbac so the caller can bound grants by it.
 * `rbac` is null only for a fully-trusted service call that did not identify an
 * acting user (qb-panel does its own gate; forward `x-acting-user-id` to also
 * enforce the escalation guard here).
 */
async function gate(request: Request, orgId: string, perm: string): Promise<
  | { ok: true; rbac: ResolvedRbac | null }
  | { ok: false; status: number; error: string }
> {
  if (isServiceAuth(request)) {
    const actingUserId = request.headers.get('x-acting-user-id')
    const rbac = actingUserId ? await resolveRbac(actingUserId, orgId) : null
    return { ok: true, rbac }
  }
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false, status: 401, error: 'Unauthorized' }
  const rbac = await resolveRbac(session.user.id, orgId)
  if (!can(rbac, perm)) return { ok: false, status: 403, error: 'Forbidden' }
  return { ok: true, rbac }
}

export async function GET(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'role.read')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const roles = await prisma.role.findMany({
    where: { organizationId: orgId },
    include: {
      permissions: { include: { permission: { select: { key: true } } } },
      _count: { select: { memberRoles: true } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id, name: r.name, description: r.description, color: r.color, icon: r.icon,
      isSystem: r.isSystem,
      permissionKeys: r.permissions.map((p) => p.permission.key),
      memberCount: r._count.memberRoles,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'role.create')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const { name, description, color, icon, permissionKeys = [] } = await request.json()
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  // Privilege-escalation guard: a caller may only put permissions into a role
  // that they themselves hold. Skipped only for a fully-trusted service call
  // that did not identify an acting user (g.rbac === null).
  if (g.rbac) {
    const missing = ungrantablePermissionKeys(g.rbac, Array.isArray(permissionKeys) ? permissionKeys : [])
    if (missing.length) {
      return NextResponse.json({ error: 'cannot grant permissions you do not hold' }, { status: 403 })
    }
  }
  const perms = await prisma.permission.findMany({
    where: { key: { in: permissionKeys }, isDeprecated: false }, select: { id: true },
  })
  try {
    const role = await prisma.role.create({
      data: {
        organizationId: orgId, name, description: description ?? null, color: color ?? null, icon: icon ?? null,
        isSystem: false,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
    })
    return NextResponse.json({ role: { id: role.id } }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Role name already exists' }, { status: 409 })
    throw e
  }
}
