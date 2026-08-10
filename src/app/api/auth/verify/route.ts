/**
 * POST /api/auth/verify
 *
 * Verifies a JWT previously issued by /api/auth/sign (RS256). Convenience
 * endpoint — microservices SHOULD verify locally via /.well-known/jwks.json.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { verifyRs256 } from '@/lib/jwks';

const BodySchema = z.object({
    token: z.string().min(10),
    purpose: z.string().min(1),
    audience: z.union([z.string(), z.array(z.string())]).optional(),
});

export const POST = withServiceAuth(async (req: NextRequest) => {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    try {
        const payload = await verifyRs256(parsed.data.token, {
            purpose: `svc:${parsed.data.purpose}`,
            audience: parsed.data.audience,
        });
        return NextResponse.json({ valid: true, payload });
    } catch (e) {
        return NextResponse.json({ valid: false, error: (e as Error).message }, { status: 401 });
    }
}, { scopes: ['jwt:verify'] });
