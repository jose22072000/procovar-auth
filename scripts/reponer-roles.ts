import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys, ROLE_DESCRIPTIONS } from '../src/rbac/system-roles'

/**
 * Devolverle a los cinco roles sus permisos de fábrica.
 *
 * PISA lo que se haya cambiado a mano en la pantalla de permisos. Por eso no lo
 * hace la siembra ni el arranque: si se repusiera solo, cada despliegue
 * devolvería en silencio un permiso que alguien quitó a propósito y nadie
 * relacionaría las dos cosas.
 *
 * Se corre cuando el catálogo ha crecido y hay que llevar las claves nuevas a
 * los roles que ya existían — sabiendo lo que se pisa.
 */
async function main() {
  for (const nombre of SYSTEM_ROLE_NAMES) {
    const rol = await prisma.role.findUnique({ where: { name: nombre }, select: { id: true } })
    if (!rol) {
      console.log(`  ${nombre}: no existe, se salta`)
      continue
    }

    const claves = systemRolePermissionKeys(nombre)
    const permisos = await prisma.permission.findMany({
      where: { key: { in: claves }, isDeprecated: false },
      select: { id: true, key: true },
    })

    // Una clave que el rol pide y el catálogo no tiene es un error de nombre, y
    // callarlo deja al rol sin ese permiso sin que se note.
    const encontradas = new Set(permisos.map((p) => p.key))
    const faltan = claves.filter((k) => !encontradas.has(k))
    if (faltan.length) console.log(`  ${nombre}: OJO, no existen estas claves: ${faltan.join(', ')}`)

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: rol.id } }),
      prisma.rolePermission.createMany({
        data: permisos.map((p) => ({ roleId: rol.id, permissionId: p.id })),
        skipDuplicates: true,
      }),
      prisma.role.update({ where: { id: rol.id }, data: { description: ROLE_DESCRIPTIONS[nombre] } }),
    ])
    console.log(`  ${nombre}: ${permisos.length} permisos`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
