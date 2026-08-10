/**
 * Admin: TenantDomain management.
 *
 * GET  /api/admin/tenant-domains   → list all
 * POST /api/admin/tenant-domains   → create (verified/active default false)
 *
 * Requires a logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

const CreateSchema = z.object({
    host: z.string().min(3).regex(/^[a-z0-9.-]+$/, 'host must be a bare lowercase hostname'),
    clientId: z.string().min(2),
    propertyId: z.string().optional(),
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
});

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const domains = await prisma.tenantDomain.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const host = parsed.data.host.toLowerCase();
    const exists = await prisma.tenantDomain.findUnique({ where: { host } });
    if (exists) return NextResponse.json({ error: 'already_exists' }, { status: 409 });

    const created = await prisma.tenantDomain.create({ data: { ...parsed.data, host } });
    audit({ action: 'admin.tenant_domain.create', userId: guard.user.id, meta: { host, clientId: created.clientId } });
    return NextResponse.json({ domain: created }, { status: 201 });
}
