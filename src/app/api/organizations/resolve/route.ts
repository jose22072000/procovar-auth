/**
 * POST /api/organizations/resolve
 *
 * Service-auth endpoint. Resolves a batch of organization ids to their public
 * identity ({ id, name, slug, logo }) — the same low-sensitivity data already
 * embedded in every user's session memberships. Used by sister services (e.g.
 * qb-back) to label a resource with the org it belongs to.
 *
 * Body: { ids: string[] }  ->  { organizations: [{ id, name, slug, logo }] }
 *
 * No extra scope required: any registered service may resolve an org's identity.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const BodySchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export const POST = withServiceAuth(async (req: NextRequest) => {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    try {
        const organizations = await prisma.organization.findMany({
            where: { id: { in: parsed.data.ids } },
            select: { id: true, name: true, slug: true, logo: true },
        });
        return NextResponse.json({ organizations });
    } catch (e) {
        logger.error('[organizations/resolve] error', { error: (e as Error).message });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
});
