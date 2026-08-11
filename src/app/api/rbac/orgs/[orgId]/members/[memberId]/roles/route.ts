import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'
import { ungrantablePermissionKeys } from '@/rbac/grantable'
import { PRECEDENCE, ROL_MINIMO } from '@/rbac/system-roles'
import type { ResolvedRbac } from '@/rbac/types'

type Params = { params: Promise<{ orgId: string; memberId: string }> }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]; const expected = (process.env.BEARER_TOKEN) || ''
  return !!token && !!expected && token === expected
}

export async function PUT(request: Request, { params }: Params) {
  const { orgId, memberId } = await params
  // Resolve the acting user's rbac so grants can be bounded by it. `actorRbac`
  // is null only for a fully-trusted service call with no acting user (qb-panel
  // does its own gate; forward `x-acting-user-id` to also enforce the guard here).
  let actorRbac: ResolvedRbac | null = null
  if (!isServiceAuth(request)) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    actorRbac = await resolveRbac(session.user.id, orgId)
    if (!can(actorRbac, 'member.assignRole')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    const actingUserId = request.headers.get('x-acting-user-id')
    if (actingUserId) actorRbac = await resolveRbac(actingUserId, orgId)
  }

  // Ensure the member actually belongs to the org in the path (prevents cross-org IDOR).
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { organizationId: true } })
  if (!member || member.organizationId !== orgId) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // An assignment is now just a role: the scope is the member's sucursal, which
  // the member row already carries. `assignments` is still accepted so older
  // callers keep working while the apps migrate.
  const body = await request.json() as {
    roleIds?: string[]
    assignments?: { roleId: string }[]
  }
  const roleIds = [...new Set(body.roleIds ?? (body.assignments ?? []).map((a) => a.roleId))]

  const roles = await prisma.role.findMany({
    where: { id: { in: roleIds } },
    select: { id: true, name: true, permissions: { select: { permission: { select: { key: true } } } } },
  })
  const validIds = new Set(roles.map((r) => r.id))
  const valid = roleIds.filter((id) => validIds.has(id))

  // Privilege-escalation guard: you may only assign a role whose permissions you
  // yourself hold. Skipped for a fully-trusted service call with no acting user.
  if (actorRbac) {
    const assignedKeys = [...new Set(
      roles.flatMap((r) => r.permissions.map((p) => p.permission?.key).filter((k): k is string => Boolean(k))),
    )]
    const missing = ungrantablePermissionKeys(actorRbac, assignedKeys)
    if (missing.length) {
      return NextResponse.json({ error: 'cannot grant permissions you do not hold' }, { status: 403 })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.memberRole.deleteMany({ where: { memberId } })
    for (const roleId of valid) {
      await tx.memberRole.create({ data: { memberId, roleId } })
    }
    // `member.role` is a single string that better-auth keeps for itself. The
    // real answer lives in memberRole, so this mirrors the highest-ranking role
    // the person now holds, to keep the two from disagreeing.
    const names = roles.filter((r) => validIds.has(r.id)).map((r) => r.name)
    const principal = PRECEDENCE.find((p) => names.includes(p)) ?? names[0] ?? ROL_MINIMO
    await tx.member.update({ where: { id: memberId }, data: { role: principal } })
  })
  return NextResponse.json({ ok: true })
}
