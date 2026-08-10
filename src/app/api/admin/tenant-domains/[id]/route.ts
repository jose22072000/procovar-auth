/**
 * Admin: single TenantDomain.
 *
 * PATCH  /api/admin/tenant-domains/:id   → set verified / active
 * DELETE /api/admin/tenant-domains/:id   → remove
 *
 * Requires a logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
}).refine((v) => v.verified !== undefined || v.active !== undefined, { message: 'nothing to update' });

export async function PATCH(req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.tenantDomain.update({ where: { id }, data: parsed.data });
    audit({ action: 'admin.tenant_domain.update', userId: guard.user.id, meta: { id, ...parsed.data } });
    return NextResponse.json({ domain: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.tenantDomain.delete({ where: { id } });
    audit({ action: 'admin.tenant_domain.delete', userId: guard.user.id, meta: { id, host: existing.host } });
    return NextResponse.json({ ok: true });
}
