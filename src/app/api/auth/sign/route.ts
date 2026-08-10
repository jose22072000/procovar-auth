/**
 * POST /api/auth/sign
 *
 * Issues a short-lived RS256 JWT containing arbitrary claims, signed by the
 * current active key in JWKS. Microservices verify it locally using
 * `/.well-known/jwks.json` — no round-trip needed.
 *
 * Service-auth required. Restricted by `jwt:sign` scope.
 *
 * Body: { claims: object, expiresIn?: '5m'|'1h'|...  audience?: string|string[], purpose: string }
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { signRs256 } from '@/lib/jwks';

const BodySchema = z.object({
    claims: z.record(z.string(), z.unknown()),
    expiresIn: z.string().default('5m'),
    audience: z.union([z.string(), z.array(z.string())]).optional(),
    purpose: z.string().min(1),
});

export const POST = withServiceAuth(async (req: NextRequest, ctx) => {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const token = await signRs256(
        { ...parsed.data.claims, iss_client: ctx.client.clientId },
        {
            purpose: `svc:${parsed.data.purpose}`,
            expiresIn: parsed.data.expiresIn,
            audience: parsed.data.audience,
        }
    );
    return NextResponse.json({ token });
}, { scopes: ['jwt:sign'] });
