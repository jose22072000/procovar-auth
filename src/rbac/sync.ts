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
  /** Concesiones creadas: aplicaciones que un rol no conocía todavía. */
  repartidas: number
}> {
  // 1. Permission catalog.
  //
  // Antes de sembrar se apunta lo que YA existía. Lo que no esté en esta lista y
  // aparezca después es un permiso que nace en esta pasada, y eso da una garantía que
  // el paso 2c necesita: nadie ha podido quitárselo a un rol a propósito, porque hasta
  // hace un segundo no existía.
  const yaExistian = new Set(
    (await prisma.permission.findMany({ select: { key: true } })).map((p) => p.key),
  )

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

  // 2b. Una aplicación que el rol no conoce todavía: sus llaves, de una vez.
  //
  // El paso 2 deja en paz a un rol que ya existe, y con razón: si en cada arranque se
  // le devolvieran sus llaves de origen, un permiso quitado a mano reaparecería solo
  // y nadie ataría los dos hechos.
  //
  // Pero eso vale para una aplicación que el rol YA tiene repartida. Cuando entra una
  // nueva —Rutas, y las que vengan— ese rol no tiene ni una sola llave suya: nadie ha
  // decidido nada sobre ella todavía, no hay nada que pisar. No repartirlas significa
  // que estrenar una aplicación deja a todo el mundo fuera hasta que alguien se
  // acuerde de ir rol por rol marcando casillas, y mientras tanto una supervisora con
  // su rol bien puesto no puede entrar. Pasó.
  //
  // La regla es por APLICACIÓN y solo cuando el rol no tiene ninguna: en cuanto tenga
  // una, esto no vuelve a tocarla nunca. Quien quiera dejar un rol sin acceso a una
  // aplicación no le quita todas las llaves —le deja la que decida y quita el resto,
  // o quita la de entrar, que es la que manda.
  const servicios = [...new Set(PERMISSION_CATALOG.map((p) => p.service))]
  let repartidas = 0

  for (const name of SYSTEM_ROLE_NAMES) {
    const rol = await prisma.role.findUnique({
      where: { name },
      select: { id: true, permissions: { select: { permission: { select: { key: true } } } } },
    })
    if (!rol) continue

    const tiene = new Set(
      rol.permissions.map((rp) => rp.permission?.key).filter((k): k is string => Boolean(k)),
    )
    const leTocan = new Set(systemRolePermissionKeys(name))

    for (const service of servicios) {
      const delServicio = PERMISSION_CATALOG.filter((p) => p.service === service).map((p) => p.key)
      if (delServicio.some((k) => tiene.has(k))) continue // ya la conoce: no se toca

      const ids = delServicio
        .filter((k) => leTocan.has(k))
        .map((k) => permByKey.get(k))
        .filter((id): id is string => Boolean(id))
      if (!ids.length) continue

      const { count } = await prisma.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: rol.id, permissionId })),
        skipDuplicates: true,
      })
      repartidas += count
    }
  }

  // 2c. Los permisos que NACEN en esta pasada van a los roles que los llevan de
  // fábrica.
  //
  // Sin esto, cada permiso nuevo del catálogo se quedaba fuera de los roles que ya
  // existían: la regla del paso 2b sólo siembra una aplicación entera a un rol que no
  // tiene NINGUNA de esa aplicación, así que en cuanto un rol tiene una llave de
  // `auth`, ninguna llave de `auth` nueva vuelve a llegarle nunca.
  //
  // Pasó con `vendedor.codigo`: GESTOR lo recibió —era su primera llave de ese
  // servicio— y SUPERVISOR no, así que el campo del código de vendedor no le habría
  // salido jamás a un supervisor. Se descubrió comprobándolo a mano; si no, habría
  // quedado ahí, callado.
  //
  // Es seguro porque se limita a lo RECIÉN CREADO. `reponer-roles.ts` arregla esto
  // mismo de golpe, pero repone los cinco roles de fábrica y pisa cualquier permiso
  // ajustado a mano en la pantalla; aquí eso no puede pasar: un permiso que no existía
  // hace un segundo no ha podido quitárselo nadie.
  const reciennacidos = PERMISSION_CATALOG
    .filter((p) => !yaExistian.has(p.key) && !p.isDeprecated)
    .map((p) => p.key)

  let nuevasRepartidas = 0
  if (reciennacidos.length) {
    for (const name of SYSTEM_ROLE_NAMES) {
      const rol = await prisma.role.findUnique({ where: { name }, select: { id: true } })
      if (!rol) continue

      const leTocan = new Set(systemRolePermissionKeys(name))
      const ids = reciennacidos
        .filter((k) => leTocan.has(k))
        .map((k) => permByKey.get(k))
        .filter((id): id is string => Boolean(id))
      if (!ids.length) continue

      const { count } = await prisma.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: rol.id, permissionId })),
        skipDuplicates: true,
      })
      nuevasRepartidas += count
    }
    console.log(
      `[rbac] permisos nuevos en el catálogo: ${reciennacidos.join(', ')} ` +
      `— repartidos a sus roles de fábrica (${nuevasRepartidas} concesiones)`,
    )
  }
  repartidas += nuevasRepartidas

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
  return {
    permissions: PERMISSION_CATALOG.length,
    orgs,
    membersBackfilled,
    repartidas,
  }
}
