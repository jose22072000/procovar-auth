/**
 * Admin: ClientApp management.
 *
 * GET  /api/admin/clients         → list all
 * POST /api/admin/clients         → create new (returns derived signing key ONCE)
 *
 * Requires logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { deriveSigningKey } from '@/lib/service-auth';
import { audit } from '@/lib/audit';

const CreateSchema = z.object({
    clientId: z.string().min(2).regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    description: z.string().optional(),
    allowedCallbackUrls: z.array(z.string().url()).default([]),
    allowedDomains: z.array(z.string().min(1)).default([]),
    scopes: z.array(z.string().min(1)).default([]),
});

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const list = await prisma.clientApp.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, clientId: true, name: true, description: true,
            allowedCallbackUrls: true, allowedDomains: true, scopes: true,
            signingKeyVersion: true, active: true, createdAt: true, updatedAt: true,
        },
    });
    return NextResponse.json({ clients: list });
}

export async function POST(req: NextRequest) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const exists = await prisma.clientApp.findUnique({ where: { clientId: parsed.data.clientId } });
    if (exists) return NextResponse.json({ error: 'already_exists' }, { status: 409 });

    const created = await prisma.clientApp.create({ data: parsed.data });
    const signingKey = deriveSigningKey(created.clientId, created.signingKeyVersion);
    audit({ action: 'admin.client.create', userId: guard.user.id, meta: { clientId: created.clientId } });

    return NextResponse.json({
        client: created,
        signingKey,
        notice: 'Store this signingKey now — it can be re-derived but never displayed by qb-auth without explicit request.',
    });
}
