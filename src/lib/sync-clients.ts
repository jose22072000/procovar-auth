/**
 * Catálogo de aplicaciones que se autentican contra este servicio, y su
 * sincronización al arrancar.
 *
 * Antes vivía solo dentro de `prisma/seed.ts`, y eso obligaba a entrar al
 * servidor y correr el seed a mano cada vez que se añadía una aplicación — con
 * el resultado previsible: la aplicación desplegada devolvía 401 y nadie sabía
 * por qué. Ahora se sincroniza en el arranque, igual que ya hacía el RBAC
 * (`syncRbac` en `src/instrumentation.ts`).
 *
 * Es idempotente y NO borra: si alguien añadió un cliente desde la pantalla de
 * administración, un despliegue no se lo lleva por delante.
 *
 * La clave de firma de cada cliente NO se guarda: se deriva de
 * SERVICE_AUTH_SECRET con `deriveSigningKey(clientId, version)`, así que basta
 * con que el clientId coincida a los dos lados.
 */
import { prisma } from './prisma'

export interface ClienteRegistrado {
    clientId: string
    name: string
    description: string
    allowedCallbackUrls: string[]
    allowedDomains: string[]
    scopes: string[]
}

export const CLIENTES: ClienteRegistrado[] = [
    {
        clientId: 'procovar-rutas',
        name: 'Procovar Rutas',
        description: 'Panel de control de los recorridos GPS de los vendedores',
        allowedCallbackUrls: [
            'https://rutas.procovar.cloud/api/auth/callback',
            'http://localhost:3600/api/auth/callback',
        ],
        // El puerto forma parte del host: `localhost` no casa con `localhost:3600`.
        allowedDomains: ['rutas.procovar.cloud', 'localhost:3600', 'localhost:3601'],
        scopes: ['callback:create', 'session:verify', 'session:revoke', 'auth:exchange'],
    },
]

export async function syncClients() {
    let creados = 0
    let actualizados = 0

    for (const c of CLIENTES) {
        const existente = await prisma.clientApp.findUnique({
            where: { clientId: c.clientId },
            select: { id: true },
        })

        if (!existente) {
            await prisma.clientApp.create({ data: c })
            creados++
            continue
        }

        // Solo las URLs y los ámbitos: el nombre y la descripción se pueden haber
        // cambiado desde la pantalla, y no es cosa del despliegue devolverlos a
        // lo que decía el código.
        await prisma.clientApp.update({
            where: { clientId: c.clientId },
            data: {
                allowedCallbackUrls: c.allowedCallbackUrls,
                allowedDomains: c.allowedDomains,
                scopes: c.scopes,
            },
        })
        actualizados++
    }

    return { creados, actualizados }
}
