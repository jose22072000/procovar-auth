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
 * Resolve the actor so the caller can bound grants by what they themselves hold.
 *
 * `orgId` is the sucursal the actor is acting IN — it decides whether they may
 * see this page at all. Pass `null` for the role catalog itself, which belongs
 * to no single sucursal: resolving against null grants only a Super Admin.
 *
 * `rbac` comes back null for a fully-trusted service call that named no acting
 * user; forward `x-acting-user-id` to have the escalation guard applied here too.
 */
async function gate(request: Request, orgId: string | null, perm: string): Promise<
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

/**
 * The role catalog. It is the SAME list for every sucursal — the `orgId` in the
 * path only says who is asking, not which roles exist. An Administrador of
 * Camagüey and one of Holguín both see the same five roles; what differs is who
 * in their own sucursal holds each one.
 */
export async function GET(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'role.read')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const roles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: { select: { key: true } } } },
      // Cuántas personas lo tienen EN ESTA sucursal. El total de Procovar no
      // sirve aquí: diría "12 operadores" a quien solo puede tocar los 2 suyos.
      _count: { select: { memberRoles: { where: { member: { organizationId: orgId } } } } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id, name: r.name, description: r.description, color: r.color, icon: r.icon,
      isSystem: r.isSystem,
      permissionKeys: r.permissions
        .map((p) => p.permission?.key)
        .filter((k): k is string => Boolean(k)),
      memberCount: r._count.memberRoles,
    })),
  })
}

/**
 * Create a role. This adds to the catalog of ALL of Procovar, so it is a Super
 * Admin action — resolving against `null` is what enforces that.
 */
export async function POST(request: Request) {
  const g = await gate(request, null, 'role.create')
  if (!g.ok) {
    return NextResponse.json(
      { error: g.status === 403 ? 'Solo un Super Admin puede crear roles: el catálogo es de toda Procovar' : g.error },
      { status: g.status },
    )
  }

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
        name, description: description ?? null, color: color ?? null, icon: icon ?? null,
        isSystem: false,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
    })
    return NextResponse.json({ role: { id: role.id } }, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 409 })
    }
    throw e
  }
}
