/**
 * GET /api/flow
 *
 * Entry point that consumes a callback token (or legacy `op` JWT) and stores
 * the validated payload in an httpOnly cookie for the rest of the auth flow.
 *
 * Query:
 *   ?callback=JWT   (new — JWT issued by /api/auth/callback-token, single-use Redis)
 *   ?op=JWT         (legacy — full payload encoded inside the JWT)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { decodeCallback } from '@/lib/callback-token';
import { decodeFlowOptions, type FlowOptions } from '@/lib/flow-state';
import { CallbackValidationError, validateCallbackPayload } from '@/lib/callback-validator';
import { logger } from '@/lib/logger';

const BASE_URL = process.env.APP_URL || 'http://localhost:3500';
const FLOW_COOKIE = 'qb.flow_state';

export async function GET(request: NextRequest) {
    const sp = request.nextUrl.searchParams;
    const callbackToken = sp.get('callback');
    const legacyOp = sp.get('op');
    const prompt = sp.get('prompt') === 'none' ? 'none' : undefined;

    if (!callbackToken && !legacyOp) {
        return NextResponse.redirect(new URL('/', BASE_URL));
    }

    let payload: FlowOptions | null = null;

    if (callbackToken) {
        try {
            const decoded = await decodeCallback(callbackToken);
            payload = {
                clientId: decoded.clientId,
                origin: decoded.callbackUrl,
                redirectOrigin: true,
                returnTo: decoded.returnTo ?? undefined,
                prompt,
            };
        } catch (e) {
            const code = e instanceof CallbackValidationError ? e.code : 'invalid_callback';
            logger.warn('[flow] callback rejected', { code, msg: (e as Error).message });
            return NextResponse.redirect(new URL(`/?error=${code}`, BASE_URL));
        }
    } else if (legacyOp) {
        logger.warn('[flow] legacy ?op= used (DEPRECATED) — migrate to ?callback=');
        const decoded = await decodeFlowOptions(legacyOp);
        // SECURITY: the legacy ?op= payload carries its own origin, so it MUST be
        // validated against the client's allowlist before we trust/persist it —
        // otherwise an attacker-crafted op could redirect to an arbitrary origin.
        if (decoded?.origin) {
            try {
                await validateCallbackPayload({
                    clientId: decoded.clientId ?? '',
                    callbackUrl: decoded.origin,
                    returnTo: typeof decoded.returnTo === 'string' ? decoded.returnTo : undefined,
                });
            } catch (e) {
                const code = e instanceof CallbackValidationError ? e.code : 'invalid_callback';
                logger.warn('[flow] legacy op rejected', { code, msg: (e as Error).message });
                return NextResponse.redirect(new URL(`/?error=${code}`, BASE_URL));
            }
        }
        payload = decoded;
    }

    if (payload) {
        const cookieStore = await cookies();
        cookieStore.set(FLOW_COOKIE, JSON.stringify(payload), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 30,
        });
    }
    // El `?sso=1` es lo que distingue "vengo de una app" de "escribí la dirección".
    // Las dos cosas acaban en `/`, y sin marca la pantalla de entrada no puede saber
    // si la galleta de flujo que hay es de este login o sobró de otro anterior.
    return NextResponse.redirect(new URL('/?sso=1', BASE_URL));
}
