/**
 * Admin: Single ClientApp management.
 *
 * GET    /api/admin/clients/[id]  → get one client
 * PATCH  /api/admin/clients/[id]  → update name/description/allowedCallbackUrls/allowedDomains/scopes/active
 * DELETE /api/admin/clients/[id]  → soft-disable (active = false)
 *
 * Requires logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

const PatchSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    allowedCallbackUrls: z.array(z.string().url()).optional(),
    allowedDomains: z.array(z.string().min(1)).optional(),
    scopes: z.array(z.string().min(1)).optional(),
    active: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const client = await prisma.clientApp.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const client = await prisma.clientApp.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    if (Object.keys(parsed.data).length === 0) {
        return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const updated = await prisma.clientApp.update({ where: { id }, data: parsed.data });
    audit({ action: 'admin.client.update', userId: guard.user.id, meta: { clientId: client.clientId, fields: Object.keys(parsed.data) } });

    return NextResponse.json({ client: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const client = await prisma.clientApp.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.clientApp.update({ where: { id }, data: { active: false } });
    audit({ action: 'admin.client.disable', userId: guard.user.id, meta: { clientId: client.clientId } });

    return NextResponse.json({ client: updated });
}
