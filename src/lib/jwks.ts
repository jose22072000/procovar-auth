/**
 * RS256 keypair store + JWKS helpers.
 *
 *  - Keys are persisted in Postgres (`JwksKey`) so multi-instance deployments
 *    share signing material.
 *  - In-process LRU caches the active signing key + the JWKS for a few minutes
 *    to avoid hitting the DB on every sign/verify.
 *  - Rotation: call `rotateKey()` to mint a new key and mark it active.
 *    Old keys remain in the JWKS until you call `revokeKey(kid)`.
 *
 * Why RS256?
 *   - Microservices can verify locally with the public JWKS — no round-trip.
 *   - Compromise of a verifier does not allow forging tokens.
 */
import { generateKeyPairSync, createPublicKey, createPrivateKey, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify, importPKCS8, importSPKI, createLocalJWKSet, type JWTPayload, type JWK } from 'jose';
import { prisma } from './prisma';
import { logger } from './logger';

const ALG = 'RS256';
/** Cache TTL for the active signing key + the JWKS document, in milliseconds.
 *  Configurable via env: JWKS_CACHE_TTL_SECONDS (default 3600 = 1 hour). */
const SIGN_TTL_MS = Math.max(60, Number(process.env.QB_AUTH_JWKS_CACHE_TTL_SECONDS ?? 3600)) * 1000;
const ISSUER = process.env.APP_URL || 'qb-auth';

interface CachedSigner {
    kid: string;
    privateKey: CryptoKey;
    expiresAt: number;
}

interface CachedJwks {
    jwks: { keys: JWK[] };
    expiresAt: number;
}

let signerCache: CachedSigner | null = null;
let jwksCache: CachedJwks | null = null;

/** Generate a new RSA-2048 keypair and persist it as the new active signing key. */
export async function rotateKey(): Promise<{ kid: string }> {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const kid = randomUUID();
    await prisma.jwksKey.create({
        data: { kid, alg: ALG, publicPem: publicKey, privatePem: privateKey, active: true },
    });
    signerCache = null;
    jwksCache = null;
    logger.info('[jwks] new keypair generated', { kid });
    return { kid };
}

/** Mark a key as no longer used for signing or verification. */
export async function revokeKey(kid: string): Promise<void> {
    await prisma.jwksKey.update({
        where: { kid },
        data: { active: false, revokedAt: new Date() },
    });
    signerCache = null;
    jwksCache = null;
}

async function loadActiveSigner(): Promise<CachedSigner> {
    if (signerCache && signerCache.expiresAt > Date.now()) return signerCache;

    let row = await prisma.jwksKey.findFirst({
        where: { active: true, revokedAt: null },
        orderBy: { createdAt: 'desc' },
    });
    if (!row) {
        // Bootstrap on first use.
        await rotateKey();
        row = await prisma.jwksKey.findFirst({
            where: { active: true, revokedAt: null },
            orderBy: { createdAt: 'desc' },
        });
        if (!row) throw new Error('Failed to bootstrap JWKS keypair');
    }
    const privateKey = await importPKCS8(row.privatePem, ALG);
    signerCache = { kid: row.kid, privateKey, expiresAt: Date.now() + SIGN_TTL_MS };
    return signerCache;
}

/** Sign a JWT with the current active key. Always sets `kid` header + `purpose` claim. */
export async function signRs256<T extends JWTPayload>(
    payload: T,
    opts: { purpose: string; expiresIn: string; audience?: string | string[]; issuer?: string }
): Promise<string> {
    const signer = await loadActiveSigner();
    const builder = new SignJWT({ ...payload, purpose: opts.purpose })
        .setProtectedHeader({ alg: ALG, typ: 'JWT', kid: signer.kid })
        .setIssuedAt()
        .setIssuer(opts.issuer ?? ISSUER)
        .setExpirationTime(opts.expiresIn);
    if (opts.audience) builder.setAudience(opts.audience);
    return builder.sign(signer.privateKey);
}

/** Verify a JWT signed by any non-revoked key in the JWKS. */
export async function verifyRs256<T extends JWTPayload = JWTPayload>(
    token: string,
    opts: { purpose: string; audience?: string | string[]; issuer?: string }
): Promise<T> {
    const jwks = await loadJwks();
    const set = createLocalJWKSet(jwks);
    const { payload } = await jwtVerify(token, set, {
        issuer: opts.issuer ?? ISSUER,
        audience: opts.audience,
    });
    if (payload.purpose !== opts.purpose) {
        throw new Error(`JWT purpose mismatch: expected '${opts.purpose}', got '${String(payload.purpose)}'`);
    }
    return payload as T;
}

/** Build the public JWKS document (cached). */
export async function loadJwks(): Promise<{ keys: JWK[] }> {
    if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.jwks;

    const rows = await prisma.jwksKey.findMany({
        where: { revokedAt: null },
        orderBy: { createdAt: 'desc' },
    });
    if (rows.length === 0) {
        // Bootstrap so /jwks.json is never empty in a healthy deploy.
        await rotateKey();
        return loadJwks();
    }
    const keys: JWK[] = rows.map((row) => {
        const pub = createPublicKey({ key: row.publicPem, format: 'pem' });
        const jwk = pub.export({ format: 'jwk' }) as JWK;
        jwk.kid = row.kid;
        jwk.alg = row.alg;
        jwk.use = 'sig';
        return jwk;
    });
    jwksCache = { jwks: { keys }, expiresAt: Date.now() + SIGN_TTL_MS };
    return jwksCache.jwks;
}

/** Force-clear the in-process caches (useful after rotation in another instance). */
export function flushCache(): void {
    signerCache = null;
    jwksCache = null;
}

// Silence unused-import warnings for re-exports.
void createPrivateKey;
void importSPKI;
