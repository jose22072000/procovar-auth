/**
 * Admin: mint a long-lived "Platform JWT" for a Service Client.
 *
 * POST /api/admin/clients/:id/mint-platform-jwt
 * Body: { expiresIn?: '7d'|'30d'|...  extraAudiences?: string[] }
 *
 * The resulting RS256 token is signed by qb-auth's active JWKS key with:
 *   - purpose:     'svc:platform'
 *   - aud:         ['qb-auth', ...extraAudiences]   (e.g. 'qb-back', 'qb-notify')
 *   - iss_client:  the ClientApp.clientId
 *   - sub:         the ClientApp.clientId
 *
 * Once deployed as the Authorization: Bearer header on the consumer, it
 * authenticates the client across qb-auth (via withServiceAuth fallback) AND
 * downstream microservices (which verify locally via /.well-known/jwks.json).
 *
 * Storage: the token is shown once. Only the audit log records the mint.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSystemAdmin } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { signRs256 } from '@/lib/jwks';
import { audit } from '@/lib/audit';
import { PLATFORM_JWT_PURPOSE, PLATFORM_JWT_AUDIENCE } from '@/lib/with-service-auth';

const BodySchema = z.object({
    /** zeit/ms style. Default 30d. */
    expiresIn: z.string().default('30d'),
    /** Additional audiences (downstream services that will verify the token). */
    extraAudiences: z.array(z.string().min(1)).max(20).default([]),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const client = await prisma.clientApp.findFirst({
        where: { OR: [{ id }, { clientId: id }] },
    });
    if (!client) {
        return NextResponse.json({ error: 'unknown_client' }, { status: 404 });
    }
    if (!client.active) {
        return NextResponse.json({ error: 'inactive_client' }, { status: 400 });
    }

    let body: unknown = {};
    try {
        body = await req.json();
    } catch {
        // empty body is allowed → defaults
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'invalid_body', details: parsed.error.format() },
            { status: 400 },
        );
    }

    const audiences = Array.from(
        new Set([PLATFORM_JWT_AUDIENCE, ...parsed.data.extraAudiences]),
    );

    const token = await signRs256(
        {
            iss_client: client.clientId,
            sub: client.clientId,
            scopes: client.scopes,
        },
        {
            purpose: PLATFORM_JWT_PURPOSE,
            expiresIn: parsed.data.expiresIn,
            audience: audiences,
        },
    );

    audit({
        action: 'admin.platform_jwt.mint',
        userId: guard.user.id,
        meta: {
            clientId: client.clientId,
            audiences,
            expiresIn: parsed.data.expiresIn,
        },
    });

    return NextResponse.json({
        clientId: client.clientId,
        token,
        audiences,
        expiresIn: parsed.data.expiresIn,
        notice:
            'Save this token NOW — it cannot be retrieved later. Use it as the `Authorization: Bearer …` header on every consumer (qb-back, qb-notify, qb-auth). To revoke: rotate the JWKS key in qb-auth.',
    });
}
