/**
 * GET /.well-known/jwks.json
 *
 * Public JWKS document. Microservices use it to verify JWTs locally
 * (no round-trip to qb-auth) via `jose.createRemoteJWKSet(...)`.
 *
 * Cache-Control derived from JWKS_CACHE_TTL_SECONDS (default 3600 = 1 h),
 * with stale-while-revalidate so a brief qb-auth outage never blocks verifiers.
 */
import { NextResponse } from 'next/server';
import { loadJwks } from '@/lib/jwks';

export const revalidate = 0;

const MAX_AGE = Math.max(60, Number(process.env.QB_AUTH_JWKS_CACHE_TTL_SECONDS ?? 3600));
const SWR = MAX_AGE * 24; // serve stale up to 1 day past expiry if hub is down

export async function GET() {
    const jwks = await loadJwks();
    return NextResponse.json(jwks, {
        headers: {
            'Cache-Control': `public, max-age=${MAX_AGE}, stale-while-revalidate=${SWR}`,
            'Content-Type': 'application/jwk-set+json',
        },
    });
}
