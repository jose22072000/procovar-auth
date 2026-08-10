/**
 * Optional helper for microservices: verify RS256 JWTs locally using the
 * public JWKS endpoint, without round-tripping to qb-auth.
 *
 * Requires the `jose` package in the consumer (peer dep, kept out of the main
 * SDK to keep it crypto-only).
 *
 *   import { createJwksVerifier } from './sdk/qb-auth-jwks';
 *   const verify = createJwksVerifier({ baseUrl: process.env.QB_AUTH_URL! });
 *   const { payload } = await verify(token, { purpose: 'webhook:payload', audience: 'qb-back' });
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyResult } from 'jose';

export interface JwksVerifierOptions {
    baseUrl: string;
    /** Override the default JWKS path. */
    jwksPath?: string;
    /** Issuer claim to assert (defaults to baseUrl). */
    issuer?: string;
    /** How long the JWKS is cached in-process (ms). */
    cacheMaxAgeMs?: number;
    /** Optional custom fetch (for tests). */
    fetch?: typeof fetch;
}

export interface VerifyTokenOptions {
    purpose: string;
    audience?: string | string[];
}

export type LocalJwtVerifier = <T extends JWTPayload = JWTPayload>(
    token: string,
    opts: VerifyTokenOptions
) => Promise<JWTVerifyResult<T>>;

export function createJwksVerifier(opts: JwksVerifierOptions): LocalJwtVerifier {
    const url = new URL(opts.jwksPath ?? '/.well-known/jwks.json', opts.baseUrl);
    const issuer = opts.issuer ?? opts.baseUrl;
    const defaultTtlMs = Math.max(60, Number(process.env.QB_AUTH_JWKS_CACHE_TTL_SECONDS ?? 3600)) * 1000;
    const jwks = createRemoteJWKSet(url, {
        cacheMaxAge: opts.cacheMaxAgeMs ?? defaultTtlMs,
        cooldownDuration: 30_000,
        [Symbol.for('nodejs.fetch')]: opts.fetch,
    });

    return async <T extends JWTPayload = JWTPayload>(token: string, vopts: VerifyTokenOptions) => {
        const result = await jwtVerify<T>(token, jwks, {
            issuer,
            audience: vopts.audience,
        });
        if (result.payload.purpose !== `svc:${vopts.purpose}`) {
            throw new Error(
                `JWT purpose mismatch: expected 'svc:${vopts.purpose}', got '${String(result.payload.purpose)}'`
            );
        }
        return result;
    };
}
