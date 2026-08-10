import { prisma } from '@/lib/prisma'
import type { ResolvedRbac } from './types'

const empty = (org: string | null, wildcard = false): ResolvedRbac => ({
  org, wildcard, global: [], byProperty: {},
})

export async function resolveRbac(userId: string, orgId: string | null): Promise<ResolvedRbac> {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { id: true, isSystemAdmin: true },
  })
  if (user?.isSystemAdmin) return empty(orgId, true)
  if (!orgId) return empty(null)

  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    include: {
      memberRoles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  })
  if (!member) return empty(orgId)

  const globalSet = new Set<string>()
  const byProperty: Record<string, Set<string>> = {}

  for (const mr of member.memberRoles) {
    // Null-guard: role_permission has NO FK on permissionId, so a row can point
    // at a permission id that is no longer in the catalog (e.g. left behind by
    // an earlier catalog generation). Prisma's `include: { permission: true }`
    // then yields `rp.permission === null` for that row, and a bare
    // `rp.permission.key` threw `Cannot read properties of null (reading 'key')`
    // — which surfaced as a 500 from POST /api/auth/verify-session and made
    // qb-back downgrade the whole session to 401, silently breaking RBAC for
    // EVERY non-systemadmin member whose role carried even one orphaned row.
    // Skip the dangling rows; a role still resolves to the permissions that DO
    // still exist. (The orphaned rows themselves are a data-integrity issue to
    // clean up / re-key separately — this guard only stops them from crashing
    // session verification.)
    const keys = mr.role.permissions
      .map((rp) => rp.permission?.key)
      .filter((k): k is string => Boolean(k))
    if (mr.scopeAllProperties) {
      for (const k of keys) globalSet.add(k)
    } else {
      const propertyIds = Array.isArray(mr.propertyIds) ? (mr.propertyIds as string[]) : []
      for (const pid of propertyIds) {
        byProperty[pid] ??= new Set<string>()
        for (const k of keys) byProperty[pid].add(k)
      }
    }
  }

  return {
    org: orgId,
    wildcard: false,
    global: [...globalSet],
    byProperty: Object.fromEntries(Object.entries(byProperty).map(([k, v]) => [k, [...v]])),
  }
}
