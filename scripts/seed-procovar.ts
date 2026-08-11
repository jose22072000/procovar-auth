import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { syncRbac } from '../src/rbac/sync'
import { SUCURSALES, APLICACIONES, callbacksDe } from '../src/rbac/procovar'

/**
 * Leave the database ready to be used: permissions, the five roles, the eight
 * sucursales and the four applications.
 *
 * Safe to run as many times as needed. Anything already there is left as it is
 * — this must never undo something changed from the permissions screen, and it
 * must never be a reason to hesitate before running it.
 */
async function main() {
  const rbac = await syncRbac()
  console.log(`Permisos: ${rbac.permissions} · miembros arreglados: ${rbac.membersBackfilled}`)

  const roles = await prisma.role.findMany({
    select: { name: true, _count: { select: { permissions: true } } },
    orderBy: { name: 'asc' },
  })
  for (const r of roles) console.log(`  rol ${r.name}: ${r._count.permissions} permisos`)

  let creadas = 0
  for (const s of SUCURSALES) {
    const slug = s.codigo.toLowerCase()
    const existe = await prisma.organization.findUnique({ where: { slug }, select: { id: true } })
    if (existe) continue
    await prisma.organization.create({
      data: {
        name: s.nombre,
        slug,
        // El código y el id que usa PEDIDO. Sin esto no habría forma de saber
        // que esta sucursal y la de PEDIDO son la misma.
        metadata: JSON.stringify({ codigo: s.codigo, pedidoId: s.pedidoId }),
      },
    })
    creadas++
  }
  console.log(`Sucursales: ${creadas} creadas, ${SUCURSALES.length} en total`)

  let apps = 0
  for (const a of APLICACIONES) {
    const callbacks = callbacksDe(a.host)
    const existe = await prisma.clientApp.findUnique({ where: { clientId: a.clientId }, select: { id: true } })
    if (existe) {
      // Las URL de vuelta sí se reponen: son la lista blanca que impide que una
      // sesión recién abierta acabe en un servidor ajeno, y tienen que
      // corresponderse con dónde está desplegada la aplicación hoy.
      await prisma.clientApp.update({
        where: { clientId: a.clientId },
        data: { allowedCallbackUrls: callbacks, allowedDomains: [a.host] },
      })
      continue
    }
    await prisma.clientApp.create({
      data: {
        clientId: a.clientId,
        name: a.name,
        description: a.description,
        allowedCallbackUrls: callbacks,
        allowedDomains: [a.host],
        scopes: ['callback:create', 'session:verify'],
        active: true,
      },
    })
    apps++
  }
  console.log(`Aplicaciones: ${apps} creadas, ${APLICACIONES.length} en total`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
