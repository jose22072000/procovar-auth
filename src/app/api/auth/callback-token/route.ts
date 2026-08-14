/**
 * POST /api/auth/callback-token
 *
 * Issues a callback token (JWT + Redis double layer, single-use) for an
 * external app to redirect the user to qb-auth /?callback=TOKEN.
 *
 * Service-auth required (HMAC headers or legacy Bearer).
 *
 * Body:
 *   { clientId: string, callbackUrl: string, returnTo?: string }
 *   (clientId MUST match the authenticated service unless caller is a privileged client)
 *
 * Response:
 *   { token, expiresIn, redirectUrl }
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { encodeCallback } from '@/lib/callback-token';
import { CallbackValidationError } from '@/lib/callback-validator';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const BodySchema = z.object({
    clientId: z.string().min(1),
    callbackUrl: z.string().url(),
    returnTo: z.string().url().optional(),
});

const APP_URL = process.env.APP_URL || 'http://localhost:3500';

export const POST = withServiceAuth(async (req: NextRequest, ctx) => {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });
    }

    // A client can only mint tokens for itself, unless it has the wildcard scope.
    const isPrivileged = ctx.client.scopes.includes('*') || ctx.client.scopes.includes('callback:any');
    if (!isPrivileged && parsed.data.clientId !== ctx.client.clientId) {
        return NextResponse.json(
            { error: 'forbidden', message: 'clientId mismatch with authenticated service' },
            { status: 403 }
        );
    }

    const rl = await rateLimit({
        scope: 'callback-token',
        identifier: ctx.client.clientId,
        capacity: 60,
        refillPerSec: 10,
    });
    if (!rl.allowed) {
        return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    try {
        const { token, expiresIn } = await encodeCallback(parsed.data);
        // Aquí se auditaba 'callback.create'. Se quitó: se dispara en CADA salto del
        // SSO, no lleva usuario (es anterior a saber quién es) y solo dice que se
        // firmó un token de ida y vuelta. Llenaba la auditoría de ruido y enterraba
        // lo que de verdad hay que poder encontrar: quién entró, quién salió y qué
        // tocó un administrador.
        return NextResponse.json({
            token,
            expiresIn,
            redirectUrl: `${APP_URL}/?callback=${encodeURIComponent(token)}`,
        });
    } catch (e) {
        if (e instanceof CallbackValidationError) {
            return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
        }
        logger.error('[callback-token] error', { error: (e as Error).message });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}, { scopes: ['callback:create'] });
