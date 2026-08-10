/**
 * Route-handler wrapper that enforces service-to-service auth.
 *
 * Usage:
 *   export const POST = withServiceAuth(async (req, ctx) => {
 *       // ctx.client.clientId is verified
 *       return NextResponse.json({ ok: true });
 *   }, { scopes: ['callback:create'] });
 *
 * Also accepts the legacy BEARER_TOKEN as a fallback (with a deprecation
 * warning logged) so existing microservices keep working until they migrate.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { ServiceAuthError, verifyRequest, type VerifiedService } from './service-auth';
import { loadActiveClient } from './callback-validator';
import { verifyRs256 } from './jwks';
import { logger } from './logger';

/**
 * Purpose tag used by Platform JWTs — long-lived RS256 tokens signed by
 * qb-auth that authenticate a client across qb-auth, qb-back and qb-notify
 * with a single Bearer header. Minted via /api/admin/clients/:id/mint-platform-jwt.
 */
export const PLATFORM_JWT_PURPOSE = 'svc:platform';
export const PLATFORM_JWT_AUDIENCE = 'qb-auth';

export interface ServiceAuthContext {
    client: VerifiedService & { scopes: string[]; name: string };
}

export interface WithServiceAuthOptions {
    /** Required scopes — client must have ALL of them. */
    scopes?: string[];
    /** Allow legacy BEARER_TOKEN fallback. Default: true. */
    allowLegacyBearer?: boolean;
}

export function withServiceAuth<T extends NextRequest, R>(
    handler: (req: T, ctx: ServiceAuthContext) => Promise<R> | R,
    opts: WithServiceAuthOptions = {}
) {
    const allowLegacy = opts.allowLegacyBearer ?? true;
    return async (req: T): Promise<R | NextResponse> => {
        try {
            const url = new URL(req.url);
            const path = url.pathname + url.search;
            const bodyText = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();

            // Recreate a request body for the inner handler since we consumed it.
            const headers = req.headers;

            // Legacy bearer fallback
            const auth = headers.get('authorization') || '';
            if (auth.startsWith('Bearer ') && !headers.get('x-signature')) {
                const provided = auth.slice(7).trim();

                // ── Platform JWT path (RS256, signed by qb-auth) ──────────
                // Long-lived token bound to a clientId that authenticates the
                // caller across qb-auth + downstream services with one header.
                try {
                    const payload = await verifyRs256<{
                        iss_client?: string;
                        sub?: string;
                    }>(provided, {
                        purpose: PLATFORM_JWT_PURPOSE,
                        audience: PLATFORM_JWT_AUDIENCE,
                    });
                    const clientId = payload.iss_client || payload.sub;
                    if (typeof clientId === 'string' && clientId.length > 0) {
                        const client = await loadActiveClient(clientId);
                        if (!client) {
                            return jsonError(401, 'unknown_client', `Unknown or inactive client: ${clientId}`);
                        }
                        if (opts.scopes?.length) {
                            const missing = opts.scopes.filter(
                                (s) => !client.scopes.includes(s) && !client.scopes.includes('*'),
                            );
                            if (missing.length) {
                                return jsonError(403, 'missing_scopes', `Missing scopes: ${missing.join(',')}`);
                            }
                        }
                        const ctx: ServiceAuthContext = {
                            client: {
                                clientId,
                                keyVersion: 0,
                                scopes: client.scopes,
                                name: client.name,
                            },
                        };
                        return forwardWithBody(req, bodyText, handler, ctx);
                    }
                } catch {
                    // fall through to legacy / HMAC paths
                }

                if (!allowLegacy) {
                    return jsonError(401, 'legacy_bearer_disabled', 'Legacy Bearer token not accepted on this endpoint');
                }
                const expected = (process.env.BEARER_TOKEN);
                if (!expected || provided !== expected) {
                    return jsonError(401, 'invalid_bearer', 'Invalid Bearer token');
                }
                logger.warn('[service-auth] legacy Bearer accepted (DEPRECATED) — migrate to HMAC', {
                    path: url.pathname,
                });
                const ctx: ServiceAuthContext = {
                    client: { clientId: 'legacy:bearer', keyVersion: 0, scopes: ['*'], name: 'Legacy Bearer' },
                };
                return forwardWithBody(req, bodyText, handler, ctx);
            }

            const verified = await verifyRequest({
                method: req.method,
                path,
                body: bodyText,
                headers,
            });

            const client = await loadActiveClient(verified.clientId);
            if (!client) return jsonError(401, 'unknown_client', `Unknown or inactive client: ${verified.clientId}`);

            if (opts.scopes?.length) {
                const missing = opts.scopes.filter((s) => !client.scopes.includes(s) && !client.scopes.includes('*'));
                if (missing.length) {
                    return jsonError(403, 'missing_scopes', `Missing scopes: ${missing.join(',')}`);
                }
            }

            const ctx: ServiceAuthContext = {
                client: { ...verified, scopes: client.scopes, name: client.name },
            };
            return forwardWithBody(req, bodyText, handler, ctx);
        } catch (e) {
            if (e instanceof ServiceAuthError) {
                return jsonError(e.status, e.code, e.message);
            }
            logger.error('[service-auth] unexpected error', { error: (e as Error).message });
            return jsonError(500, 'internal_error', 'Internal Server Error');
        }
    };
}

function jsonError(status: number, code: string, message: string): NextResponse {
    return NextResponse.json({ error: code, message }, { status });
}

async function forwardWithBody<T extends NextRequest, R>(
    original: T,
    bodyText: string,
    handler: (req: T, ctx: ServiceAuthContext) => Promise<R> | R,
    ctx: ServiceAuthContext
): Promise<R> {
    if (original.method === 'GET' || original.method === 'HEAD') {
        return handler(original, ctx);
    }
    // Reconstruct a Request with the same body for the inner handler.
    const cloned = new Request(original.url, {
        method: original.method,
        headers: original.headers,
        body: bodyText,
    }) as unknown as T;
    return handler(cloned, ctx);
}
