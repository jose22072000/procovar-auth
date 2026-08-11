import { prisma } from '@/lib/prisma'
import { PERMISSION_CATALOG } from './permissions.catalog'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys, ROLE_DESCRIPTIONS } from './system-roles'
import { legacyRoleToSystemRole } from './seed-core'

/**
 * Idempotently sync the RBAC catalog into the DB:
 *  1. upsert the code-defined PERMISSION_CATALOG,
 *  2. ensure the system roles (owner/admin/staff/agent) + their permissions per org,
 *  3. backfill a MemberRole for members that lack one.
 * Safe to run repeatedly (on boot via instrumentation, or from the admin button).
 * Returns counts for the admin UI.
 */
export async function syncRbac(): Promise<{
  permissions: number
  orgs: number
  membersBackfilled: number
}> {
  // 1. Permission catalog.
  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {
        resource: p.resource, action: p.action, service: p.service,
        group: p.group, label: p.label, description: p.description ?? undefined,
        isDeprecated: p.isDeprecated ?? false,
      },
      create: {
        key: p.key, resource: p.resource, action: p.action, service: p.service,
        group: p.group, label: p.label, description: p.description ?? undefined,
        isDeprecated: p.isDeprecated ?? false,
      },
    })
  }
  const allPermissions = await prisma.permission.findMany()
  const permByKey = new Map(allPermissions.map((p) => [p.key, p.id]))

  // 1b. Prune orphaned role_permission rows — ones whose permission no longer
  // exists. role_permission has NO FK on permissionId, and this sync (step 2)
  // is ADD-ONLY: when a permission leaves PERMISSION_CATALOG (removed or
  // renamed) its permission row goes away but the role_permission rows pointing
  // at it linger forever. Those dangling rows grant nothing (the permission is
  // gone) yet used to CRASH resolveRbac's `rp.permission.key` with a null deref
  // → 500 on verify-session → qb-back downgraded the whole session to 401,
  // silently breaking RBAC for every non-systemadmin member of the affected
  // org (found 567 such rows in a real DB, 2026-07-23). Deleting them is safe —
  // no effective access changes — and self-heals on every boot/admin-sync, so
  // resolveRbac's null-guard becomes belt-and-suspenders rather than the only
  // line of defense. Guarded on a non-empty catalog so a misconfigured empty
  // catalog can never wipe every grant.
  const validPermissionIds = allPermissions.map((p) => p.id)
  if (validPermissionIds.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { permissionId: { notIn: validPermissionIds } },
    })
  }

  // 2. The five roles. ONE catalog for all of Procovar, not one per sucursal.
  //
  // A role that already exists is left ALONE. Its permissions are seeded once,
  // when this creates it; after that the permissions screen owns them. If this
  // kept adding the seed keys on every boot, every deploy would quietly hand
  // back a permission somebody had deliberately taken away, and nobody would
  // connect the two events.
  for (const name of SYSTEM_ROLE_NAMES) {
    const existente = await prisma.role.findUnique({ where: { name }, select: { id: true } })
    if (existente) {
      await prisma.role.update({ where: { id: existente.id }, data: { isSystem: true } })
      continue
    }

    const role = await prisma.role.create({
      data: { name, isSystem: true, description: ROLE_DESCRIPTIONS[name] },
    })
    const wantIds = systemRolePermissionKeys(name)
      .map((k) => permByKey.get(k))
      .filter((id): id is string => Boolean(id))
    if (wantIds.length) {
      await prisma.rolePermission.createMany({
        data: wantIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      })
    }
  }

  // 3. A member with no role at all can do nothing and cannot be fixed from the
  // screen (the screen lists roles, and they hold none). Give them the one their
  // `member.role` string says.
  let membersBackfilled = 0
  const members = await prisma.member.findMany({
    include: { memberRoles: { select: { id: true } } },
  })
  for (const m of members) {
    if (m.memberRoles.length > 0) continue
    const role = await prisma.role.findUnique({
      where: { name: legacyRoleToSystemRole(m.role) },
    })
    if (!role) continue
    await prisma.memberRole.create({ data: { memberId: m.id, roleId: role.id } })
    membersBackfilled++
  }

  const orgs = await prisma.organization.count()
  return { permissions: PERMISSION_CATALOG.length, orgs, membersBackfilled }
}
