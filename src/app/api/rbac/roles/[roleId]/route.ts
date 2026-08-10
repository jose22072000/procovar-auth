import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'
import { ungrantablePermissionKeys } from '@/rbac/grantable'

type Params = { params: Promise<{ roleId: string }> }

type Actor = { id: string; isSystemAdmin: boolean }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}

/**
 * Resolve the acting user. Two paths:
 *  - Browser session cookie → the logged-in user.
 *  - Service auth (BEARER_TOKEN, used by qb-panel) → the user named in the
 *    `x-acting-user-id` header. qb-auth re-loads that user so the system-role
 *    guard and permission checks are enforced server-side (defense in depth),
 *    not delegated entirely to the trusted caller.
 */
async function actor(request: Request): Promise<Actor | null> {
  if (isServiceAuth(request)) {
    const actingUserId = request.headers.get('x-acting-user-id')
    if (!actingUserId) return null
    const u = await prisma.user.findUnique({
      where: { id: actingUserId }, select: { id: true, isSystemAdmin: true },
    })
    return u ?? null
  }
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ? { id: session.user.id, isSystemAdmin: session.user.isSystemAdmin } : null
}

export async function PATCH(request: Request, { params }: Params) {
  const { roleId } = await params
  const user = await actor(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  if (role.isSystem && !user.isSystemAdmin) {
    return NextResponse.json({ error: 'System roles can only be edited by a system admin' }, { status: 403 })
  }
  const actorRbac = await resolveRbac(user.id, role.organizationId)
  if (!role.isSystem && !can(actorRbac, 'role.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, color, icon, permissionKeys } = await request.json()
  // Privilege-escalation guard: you may only set permissions on a role that you
  // yourself hold (systemadmin/wildcard grants anything). Only enforced when the
  // request actually replaces the permission set.
  if (Array.isArray(permissionKeys)) {
    const missing = ungrantablePermissionKeys(actorRbac, permissionKeys)
    if (missing.length) {
      return NextResponse.json({ error: 'cannot grant permissions you do not hold' }, { status: 403 })
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(icon !== undefined ? { icon } : {}),
      },
    })
    if (Array.isArray(permissionKeys)) {
      const perms = await tx.permission.findMany({
        where: { key: { in: permissionKeys }, isDeprecated: false }, select: { id: true },
      })
      await tx.rolePermission.deleteMany({ where: { roleId } })
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId, permissionId: p.id })), skipDuplicates: true,
      })
    }
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const { roleId } = await params
  const user = await actor(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await prisma.role.findUnique({
    where: { id: roleId }, include: { _count: { select: { memberRoles: true } } },
  })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (role.isSystem) return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })

  const rbac = await resolveRbac(user.id, role.organizationId)
  if (!can(rbac, 'role.delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (role._count.memberRoles > 0) {
    return NextResponse.json({ error: 'Role has members assigned; reassign them first' }, { status: 409 })
  }
  await prisma.role.delete({ where: { id: roleId } })
  return NextResponse.json({ ok: true })
}
