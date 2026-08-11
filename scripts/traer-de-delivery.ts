import 'dotenv/config'
import { Client } from 'pg'
import { prisma } from '../src/lib/prisma'

/**
 * Traer las cuentas de delivery a Accesos, **con su contraseña tal cual**.
 *
 * Delivery deja de tener usuarios propios: los gestiona Accesos. Pero eso no
 * puede costarle a nadie su contraseña, así que el hash se copia como está —es
 * bcrypt, y `auth.ts` sabe leerlo— y cada uno sigue entrando igual que ayer.
 *
 * No se borra nada allí: sus fichas siguen sosteniendo los pedidos, las rutas y
 * los vehículos que cada uno creó. Esto solo añade aquí lo que allí ya existía.
 *
 * Se puede correr las veces que haga falta: a quien ya esté, no se le toca.
 */

/** El rol de Accesos que le corresponde a cada rol de delivery. */
function rolDeAccesos(rolDeDelivery: string): string {
    // En delivery solo hay `admin` y `operator`, y quien es `admin` allí lo es
    // de todo: ve las ocho sucursales. Aquí eso es Super Admin.
    return rolDeDelivery === 'admin' ? 'SUPER ADMIN' : 'OPERADOR'
}

async function main() {
    const urlDelivery = process.env.DELIVERY_DATABASE_URL
    if (!urlDelivery) {
        console.error('falta DELIVERY_DATABASE_URL')
        process.exit(2)
    }

    const cliente = new Client({ connectionString: urlDelivery })
    await cliente.connect()

    const { rows } = await cliente.query<{
        email: string
        name: string
        role: string
        password: string | null
        externalId: string | null
    }>(`
        SELECT u.email, u.name, u.role, u.password, b."externalId"
          FROM "User" u
          LEFT JOIN "Branch" b ON b.id = u."branchId"
         ORDER BY u."createdAt"
    `)
    await cliente.end()

    console.log(`  en delivery hay ${rows.length} cuentas`)

    const roles = await prisma.role.findMany({ select: { id: true, name: true } })
    const rolPorNombre = new Map(roles.map((r) => [r.name, r.id]))

    const sucursales = await prisma.organization.findMany({ select: { id: true, slug: true } })
    const sucursalPorCodigo = new Map(sucursales.map((s) => [s.slug.toUpperCase(), s.id]))

    let traidas = 0
    let yaEstaban = 0

    for (const p of rows) {
        const email = p.email.trim().toLowerCase()

        const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } })
        if (existente) {
            yaEstaban++
            console.log(`  ${email}: ya estaba, no se toca`)
            continue
        }

        const nombreRol = rolDeAccesos(p.role)
        const roleId = rolPorNombre.get(nombreRol)
        if (!roleId) {
            console.log(`  ${email}: no existe el rol ${nombreRol}, se salta`)
            continue
        }

        const esGlobal = nombreRol === 'SUPER ADMIN'
        const sucursalId = p.externalId ? sucursalPorCodigo.get(p.externalId.toUpperCase()) : undefined

        await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: {
                    name: p.name,
                    email,
                    // Quien mandaba en delivery manda aquí en todas las
                    // sucursales: es lo que ya tenía, ni más ni menos.
                    isSystemAdmin: esGlobal,
                    // Venían de un sistema donde ya trabajaban: no se les manda a
                    // verificar un correo para poder seguir entrando.
                    emailVerified: true,
                },
                select: { id: true },
            })

            if (p.password) {
                // El hash se copia SIN TOCAR. Es bcrypt y `auth.ts` sabe leerlo,
                // así que la contraseña de siempre sigue valiendo.
                await tx.account.create({
                    data: {
                        userId: u.id,
                        accountId: u.id,
                        providerId: 'credential',
                        password: p.password,
                    },
                })
            }

            // Un Super Admin no pertenece a ninguna sucursal: las ve todas.
            if (!esGlobal && sucursalId) {
                await tx.member.create({
                    data: {
                        userId: u.id,
                        organizationId: sucursalId,
                        role: nombreRol,
                        memberRoles: { create: { roleId } },
                    },
                })
            }
        })

        traidas++
        console.log(`  ${email}: traída como ${nombreRol}${p.password ? ' con su contraseña' : ' SIN contraseña'}`)
    }

    console.log(`\n  ${traidas} traídas · ${yaEstaban} ya estaban`)
}

main()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1) })
