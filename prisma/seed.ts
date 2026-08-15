import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { createHmac } from 'node:crypto'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function deriveSigningKey(clientId: string, version = 1): string {
    const secret = process.env.SERVICE_AUTH_SECRET
    if (!secret) return '<SERVICE_AUTH_SECRET-not-set>'
    return createHmac('sha256', secret).update(`svc:v${version}:${clientId}`).digest('hex')
}

const clients: Array<{
    clientId: string
    name: string
    description: string
    allowedCallbackUrls: string[]
    allowedDomains: string[]
    scopes: string[]
}> = [
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
    {
        clientId: 'qb-booking',
        name: 'QB Booking',
        description: 'Public booking flow',
        allowedCallbackUrls: [
            'https://qb-booking.hostravel.com/api/auth/callback',
            'http://localhost:3400/api/auth/callback',
            'https://qb.hostravel.net/api/auth/callback',
        ],
        allowedDomains: ['qb-booking.hostravel.com', 'localhost', 'localhost:3400', 'qb.hostravel.net'],
        scopes: ['callback:create', 'session:verify', 'session:revoke', 'auth:exchange', 'jwt:sign', 'jwt:verify'],
    },
    {
        clientId: 'qb-back',
        name: 'QB Backend',
        description: 'Internal backend services',
        allowedCallbackUrls: [],
        allowedDomains: [],
        scopes: ['session:verify', 'session:revoke', 'apikey:verify', 'jwt:sign', 'jwt:verify'],
    },
    {
        clientId: 'qb-panel',
        name: 'QB Panel',
        description: 'Dashboard frontend (BFF) calling qb-auth from Server Actions',
        allowedCallbackUrls: [
            'https://qb-panel.hostravel.com/api/auth/callback',
        ],
        allowedDomains: ['qb-panel.hostravel.com', 'localhost'],
        scopes: ['callback:create', 'session:verify', 'session:revoke', 'auth:exchange', 'jwt:sign', 'jwt:verify'],
    },
    {
        clientId: 'qb-notify',
        name: 'QB Notify',
        description: 'Notification service (emails/SMS/push). No interactive login; signs service-JWTs via hub to call other backends.',
        allowedCallbackUrls: [],
        allowedDomains: [],
        scopes: ['session:verify', 'apikey:verify', 'jwt:sign', 'jwt:verify'],
    },
    {
        clientId: 'qb-templates',
        name: 'QB Templates',
        description: 'Templates microservice. No interactive login; signs service-JWTs via hub to call qb-back / qb-notify and verify incoming session cookies.',
        allowedCallbackUrls: [],
        allowedDomains: [],
        scopes: ['session:verify', 'session:revoke', 'apikey:verify', 'jwt:sign', 'jwt:verify'],
    },
    {
        clientId: 'qb-sync',
        name: 'QB Sync',
        description: 'PMS sync worker. Service-only; signs JWTs to push availability/reservations into qb-back.',
        allowedCallbackUrls: [],
        allowedDomains: [],
        scopes: ['session:verify', 'jwt:sign', 'jwt:verify'],
    },
]

const plans = [
    {
        key: 'basic',
        name: 'Basic',
        description: 'Get started with 1 property template activation.',
        priceMonthly: 29.99,
        priceYearly: 299.99,
        sortOrder: 1,
        icon: 'shield',
        color: 'zinc',
        popular: false,
        features: {
            maxProperties: 1,
            support: 'email_call_whatsapp',
            analytics: true,
            customBranding: true,
            prioritySupport: false,
            apiAccess: false,
        },
    },
    {
        key: 'pro',
        name: 'Pro',
        description: 'Manage up to 5 properties with advanced features.',
        priceMonthly: 59.99,
        priceYearly: 599.99,
        sortOrder: 2,
        icon: 'crown',
        color: 'indigo',
        popular: true,
        features: {
            maxProperties: 5,
            support: 'email_call_whatsapp',
            analytics: true,
            customBranding: true,
            prioritySupport: false,
            apiAccess: false,
        },
    },
    {
        key: 'pro_plus',
        name: 'Pro Plus',
        description: 'Unlimited properties with full access to all features.',
        priceMonthly: 99.99,
        priceYearly: 999.99,
        sortOrder: 3,
        icon: 'gem',
        color: 'purple',
        popular: false,
        features: {
            maxProperties: -1, // -1 = unlimited
            support: 'email_call_whatsapp',
            analytics: true,
            customBranding: true,
            prioritySupport: true,
            apiAccess: true,
        },
    },
]

async function main() {
    console.log('Seeding plans...')

    for (const plan of plans) {
        const upserted = await prisma.plan.upsert({
            where: { key: plan.key },
            update: {
                name: plan.name,
                description: plan.description,
                priceMonthly: plan.priceMonthly,
                priceYearly: plan.priceYearly,
                features: plan.features,
                sortOrder: plan.sortOrder,
                icon: plan.icon,
                color: plan.color,
                popular: plan.popular,
            },
            create: plan,
        })
        console.log(`  ✓ ${upserted.name} (${upserted.key})`)
    }

    console.log('Seeding ClientApps...')
    for (const c of clients) {
        const upserted = await prisma.clientApp.upsert({
            where: { clientId: c.clientId },
            update: {
                name: c.name,
                description: c.description,
                allowedCallbackUrls: c.allowedCallbackUrls,
                allowedDomains: c.allowedDomains,
                scopes: c.scopes,
            },
            create: {
                clientId: c.clientId,
                name: c.name,
                description: c.description,
                allowedCallbackUrls: c.allowedCallbackUrls,
                allowedDomains: c.allowedDomains,
                scopes: c.scopes,
            },
        })
        const key = deriveSigningKey(upserted.clientId, upserted.signingKeyVersion)
        console.log(`  ✓ ${upserted.name} (${upserted.clientId})`)
        console.log(`     signingKey (v${upserted.signingKeyVersion}): ${key}`)
    }

    console.log('Seeding complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
