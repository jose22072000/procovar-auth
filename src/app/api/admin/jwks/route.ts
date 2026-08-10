/**
 * Admin: JWKS keypair management.
 *
 * GET  /api/admin/jwks          → list all keys (public PEM only)
 * POST /api/admin/jwks/rotate   → mint and activate a new keypair
 * DELETE /api/admin/jwks/:kid   → revoke a key (cannot sign, cannot verify)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const list = await prisma.jwksKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, kid: true, alg: true, publicPem: true, active: true, revokedAt: true, expiresAt: true, createdAt: true },
    });
    return NextResponse.json({ keys: list });
}
