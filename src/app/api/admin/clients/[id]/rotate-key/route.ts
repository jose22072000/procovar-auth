/**
 * Admin: Rotate a ClientApp's signing key (bump signingKeyVersion).
 * Old version stops working immediately.
 *
 * POST /api/admin/clients/:id/rotate-key
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { deriveSigningKey } from '@/lib/service-auth';
import { audit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const existing = await prisma.clientApp.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.clientApp.update({
        where: { id },
        data: { signingKeyVersion: existing.signingKeyVersion + 1 },
    });
    const signingKey = deriveSigningKey(updated.clientId, updated.signingKeyVersion);
    audit({
        action: 'admin.client.rotate_key',
        userId: guard.user.id,
        meta: { clientId: updated.clientId, newVersion: updated.signingKeyVersion },
    });
    return NextResponse.json({
        clientId: updated.clientId,
        signingKeyVersion: updated.signingKeyVersion,
        signingKey,
    });
}
