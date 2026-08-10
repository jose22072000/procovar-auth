/**
 * POST /api/auth/api-keys/verify
 *
 * Validates an API key and returns the metadata. Service-auth required.
 * Body: { key: string }
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { verifyApiKey } from '@/lib/api-key';

const BodySchema = z.object({ key: z.string().min(20) });

export const POST = withServiceAuth(async (req: NextRequest) => {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const result = await verifyApiKey(parsed.data.key);
    if (!result) return NextResponse.json({ valid: false }, { status: 401 });
    return NextResponse.json({ valid: true, ...result });
}, { scopes: ['apikey:verify'] });
