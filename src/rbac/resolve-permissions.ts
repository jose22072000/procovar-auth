import { prisma } from '@/lib/prisma'
import type { ResolvedRbac } from './types'

const empty = (org: string | null, wildcard = false): ResolvedRbac => ({
  org, wildcard, global: [],
})

export async function resolveRbac(userId: string, orgId: string | null): Promise<ResolvedRbac> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isSystemAdmin: true,
      defaultRole: { include: { permissions: { include: { permission: true } } } },
    },
  })
  if (user?.isSystemAdmin) return empty(orgId, true)
  if (!orgId) return empty(null)

  // El rol es de la PERSONA, no de la sucursal.
  //
  // Alguien es Supervisora, y lo es en Granma y en Bayamo y en la que la pongan
  // mañana. Cuando el rol vivía solo dentro de la membresía había que repetirlo en
  // cada sucursal y podían acabar siendo distintos sin que nadie lo notara —y quien
  // no estaba en ninguna no tenía rol en ninguna parte—. El de la persona es la base;
  // lo de la membresía se suma por si a alguien le hace falta algo extra en una
  // sucursal concreta.
  const suyos = new Set<string>()
  for (const rp of user?.defaultRole?.permissions ?? []) {
    const key = rp.permission?.key
    if (key) suyos.add(key)
  }

  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    include: {
      memberRoles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  })
  // Sin membresía, lo que la persona lleva encima. Pertenecer a la sucursal es otra
  // pregunta, y la contesta quien llame a esto mirando `org`.
  if (!member) return { org: orgId, wildcard: false, global: [...suyos] }

  // A member can hold several roles, and the result is the UNION of what they
  // grant. Roles only add — there is no "deny" permission — so no rule can ever
  // depend on which of a person's roles happened to be read first.
  const granted = new Set<string>(suyos)

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
