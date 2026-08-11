import { prisma } from '@/lib/prisma'
import type { ResolvedRbac } from './types'

const empty = (org: string | null, wildcard = false): ResolvedRbac => ({
  org, wildcard, global: [],
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

  // A member can hold several roles, and the result is the UNION of what they
  // grant. Roles only add — there is no "deny" permission — so no rule can ever
  // depend on which of a person's roles happened to be read first.
  const granted = new Set<string>()

  for (const mr of member.memberRoles) {
    // `rp.permission` can be null: role_permission has NO foreign key on
    // permissionId, so a row may point at a permission that is no longer in the
    // catalog — left behind by an earlier seed. Reading `rp.permission.key`
    // directly threw `Cannot read properties of null (reading 'key')`, which
    // came out as a 500 from verify-session; the calling app read that as "no
    // session" and logged the person out. One stale row was enough to break
    // every member holding that role.
    //
    // Skipping the dangling rows keeps the rest of the role working. The rows
    // themselves still need cleaning up — this guard only stops them from
    // taking down session verification.
    for (const rp of mr.role.permissions) {
      const key = rp.permission?.key
      if (key) granted.add(key)
    }
  }

  return { org: orgId, wildcard: false, global: [...granted] }
}
