import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys } from '../src/rbac/system-roles'

/**
 * Darle a cada rol del sistema los permisos que le faltan de fábrica. SIN QUITAR NADA.
 *
 * Es lo que diferencia esto de `reponer-roles.ts`: aquel deja el rol EXACTAMENTE como
 * la fábrica, así que se lleva por delante cualquier permiso concedido a mano desde la
 * pantalla. Este sólo suma.
 *
 * Hizo falta porque el sync tenía un hueco: sólo sembraba una aplicación entera a un
 * rol que no tuviera NINGUNA llave de esa aplicación, así que cada permiso añadido
 * después al catálogo nunca llegaba a los roles que ya existían. Acumulado durante
 * meses, dejó a los seis roles incompletos —al Super Admin le faltaban 46 de 84— y a
 * todos sin `pedido.entrar` ni `delivery.entrar`, las llaves de entrada.
 *
 * No se notaba porque el Super Admin se salta las comprobaciones (`isSystemAdmin`), así
 * que quien administra lo ve todo y da por hecho que los demás también.
 *
 * El hueco ya está tapado en `sync.ts` (paso 2c) para los permisos NUEVOS. Esto es para
 * los que se quedaron atrás.
 */
async function main() {
    let total = 0

    for (const name of SYSTEM_ROLE_NAMES) {
        const rol = await prisma.role.findUnique({
            where: { name },
            select: { id: true, permissions: { select: { permission: { select: { key: true } } } } },
        })
        if (!rol) { console.log(`  ${name}: no existe, se salta`); continue }

        const tiene = new Set(
            rol.permissions.map((r) => r.permission?.key).filter((k): k is string => Boolean(k)),
        )
        const faltan = systemRolePermissionKeys(name).filter((k) => !tiene.has(k))
        if (!faltan.length) { console.log(`  ${name}: completo`); continue }

        const permisos = await prisma.permission.findMany({
            where: { key: { in: faltan }, isDeprecated: false },
            select: { id: true, key: true },
        })

        // Una clave que el rol pide y el catálogo no tiene es un error de nombre en el
        // código, no un permiso que falte: se dice en voz alta en vez de tragárselo.
        const encontradas = new Set(permisos.map((p) => p.key))
        const inexistentes = faltan.filter((k) => !encontradas.has(k))
        if (inexistentes.length) {
            console.log(`  ${name}: OJO, estas claves no existen en el catálogo: ${inexistentes.join(', ')}`)
        }

        const { count } = await prisma.rolePermission.createMany({
            data: permisos.map((p) => ({ roleId: rol.id, permissionId: p.id })),
            skipDuplicates: true,
        })
        total += count
        console.log(`  ${name}: +${count} permisos`)
    }

    console.log(`\n  ${total} concesiones añadidas. No se quitó ninguna.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
