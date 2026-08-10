/**
 * Admin: API Key management.
 *
 * GET  /api/admin/api-keys                 → list (no secrets)
 * POST /api/admin/api-keys                 → create (returns plain key ONCE)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { createApiKey } from '@/lib/api-key';
import { audit } from '@/lib/audit';

const CreateSchema = z.object({
    name: z.string().min(1),
    clientAppId: z.string().optional().nullable(),
    userId: z.string().optional().nullable(),
    scopes: z.array(z.string()).default([]),
    expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const list = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, prefix: true, name: true, scopes: true,
            clientAppId: true, userId: true, lastUsedAt: true,
            expiresAt: true, revokedAt: true, createdAt: true,
        },
    });
    return NextResponse.json({ apiKeys: list });
}

export async function POST(req: NextRequest) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const created = await createApiKey({
        name: parsed.data.name,
        clientAppId: parsed.data.clientAppId ?? null,
        userId: parsed.data.userId ?? null,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });
    audit({ action: 'admin.apikey.create', userId: guard.user.id, meta: { prefix: created.prefix, name: parsed.data.name } });

    return NextResponse.json({
        ...created,
        notice: 'Store this key now — it cannot be retrieved again.',
    });
}
