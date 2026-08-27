import 'dotenv/config'
import { Client } from 'pg'
import { prisma } from '../src/lib/prisma'

/**
 * Juntar en Accesos lo que cada sistema sabe de una sucursal.
 *
 * Hoy está repartido y nadie tiene el conjunto:
 *
 *   PEDIDO     el código (CAM, STG…) con el que se cruza todo
 *   delivery   dónde está, y sobre todo DÓNDE ESTÁ SU ALMACÉN
 *   Rutas      si está activa y su zona horaria
 *   Analytics  metas y gestores
 *
 * Aquí se trae lo que es un HECHO de la sucursal —su sitio, su almacén, cómo se llama
 * en los demás sistemas—. Lo que es ajuste de cada aplicación se queda donde está: las
 * jornadas y radios de parada de Rutas, las metas de Analytics, los vehículos de
 * delivery. Identidad aquí, operación allí.
 *
 * El almacén importa más de lo que parece: **el domicilio se cobra por la distancia
 * desde el almacén**, no desde la oficina. Ese dato vive hoy sólo dentro de delivery.
 *
 * Idempotente: no pisa lo que ya esté puesto a mano, sólo rellena lo que falte.
 */
async function main() {
    const url = process.env.DELIVERY_DATABASE_URL
    if (!url) {
        console.error('falta DELIVERY_DATABASE_URL')
        process.exit(2)
    }

    const cliente = new Client({ connectionString: url })
    await cliente.connect()

    const { rows } = await cliente.query<{
        codigo: string | null
        address: string | null
        lat: number | null
        lng: number | null
        alm_nombre: string | null
        alm_address: string | null
        alm_lat: number | null
        alm_lng: number | null
    }>(`
        SELECT b."externalId" AS codigo,
               b.address, b.lat, b.lng,
               o.name    AS alm_nombre,
               o.address AS alm_address,
               o.lat     AS alm_lat,
               o.lng     AS alm_lng
          FROM "Branch" b
          LEFT JOIN LATERAL (
            SELECT * FROM "SavedOrigin" s
             WHERE s."branchId" = b.id
             ORDER BY s."createdAt" DESC LIMIT 1
          ) o ON true
         WHERE b."externalId" IS NOT NULL
    `)
    await cliente.end()

    console.log(`  delivery conoce ${rows.length} sucursales`)

    let actualizadas = 0, sinPareja = 0

    for (const b of rows) {
        const codigo = (b.codigo || '').toUpperCase()
        const org = await prisma.organization.findFirst({
            where: { OR: [{ codigo }, { slug: codigo.toLowerCase() }] },
        })
        if (!org) {
            console.log(`  ${codigo}: no existe en Accesos, se salta`)
            sinPareja++
            continue
        }

        // `??` y no `||`: sólo se rellena lo que está SIN PONER. Si alguien ya corrigió
        // una dirección a mano aquí, esta importación no viene a deshacerlo.
        await prisma.organization.update({
            where: { id: org.id },
            data: {
                codigo: org.codigo ?? codigo,
                direccion: org.direccion ?? b.address,
                latitud: org.latitud ?? b.lat,
                longitud: org.longitud ?? b.lng,
            },
        })

        // El almacén, ahora en su propia tabla: una sucursal puede tener varios. Este
        // script trae el que viene de delivery y lo deja como principal SÓLO si la
        // sucursal no tiene ninguno — no vaya a pisar los que se hayan añadido a mano.
        if (b.alm_lat != null && b.alm_lng != null) {
            const yaTiene = await prisma.almacen.count({ where: { orgId: org.id } })

            if (yaTiene === 0) {
                await prisma.almacen.create({
                    data: {
                        orgId: org.id,
                        nombre: b.alm_nombre || org.name,
                        direccion: b.alm_address ?? null,
                        latitud: b.alm_lat,
                        longitud: b.alm_lng,
                        principal: true,
                    },
                })
            }
        }
        actualizadas++
    }

    const total = await prisma.organization.count()
    const conCoords = await prisma.organization.count({ where: { latitud: { not: null } } })
    const conAlmacen = await prisma.organization.count({ where: { almacenes: { some: { latitud: { not: null } } } } })

    console.log(`\n  ${actualizadas} completadas · ${sinPareja} sin pareja en Accesos`)
    console.log(`  sucursales en Accesos: ${total}`)
    console.log(`  con coordenadas:       ${conCoords}`)
    console.log(`  con almacén ubicado:   ${conAlmacen}`)
    if (conAlmacen < total) {
        console.log(`\n  OJO: ${total - conAlmacen} sin almacén ubicado. El domicilio se cobra`)
        console.log(`  por la distancia DESDE EL ALMACÉN, así que ahí no se puede cotizar.`)
    }
}

main()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1) })
