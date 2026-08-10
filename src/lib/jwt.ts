/**
 * Centralized JWT helpers (HS256).
 *
 * All JWTs emitted by qb-auth use named purposes via the `purpose` claim
 * to avoid token confusion attacks (e.g. a callback token cannot be
 * accepted as a session token).
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const enc = new TextEncoder();

function getKey(secretEnvVar: string): Uint8Array {
    const secret = process.env[secretEnvVar];
    if (!secret || secret.length < 32) {
        throw new Error(`${secretEnvVar} must be set and at least 32 chars`);
    }
    return enc.encode(secret);
}

export interface SignOptions {
    /** Identifier for the secret env var (CALLBACK_SECRET, SERVICE_AUTH_SECRET, BETTER_AUTH_SECRET). */
    secretEnvVar: string;
    /** e.g. '5m', '60s', '1h' */
    expiresIn: string;
    /** Logical purpose tag, asserted on verify. */
    purpose: string;
    issuer?: string;
    audience?: string | string[];
}

export interface VerifyOptions {
    secretEnvVar: string;
    purpose: string;
    issuer?: string;
    audience?: string | string[];
}

const ISSUER = process.env.APP_URL || 'qb-auth';

export async function signJwt<T extends JWTPayload>(payload: T, opts: SignOptions): Promise<string> {
    const builder = new SignJWT({ ...payload, purpose: opts.purpose })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer(opts.issuer ?? ISSUER)
        .setExpirationTime(opts.expiresIn);
    if (opts.audience) builder.setAudience(opts.audience);
    return builder.sign(getKey(opts.secretEnvVar));
}

export async function verifyJwt<T extends JWTPayload = JWTPayload>(
    token: string,
    opts: VerifyOptions
): Promise<T> {
    const { payload } = await jwtVerify(token, getKey(opts.secretEnvVar), {
        issuer: opts.issuer ?? ISSUER,
        audience: opts.audience,
    });
    if (payload.purpose !== opts.purpose) {
        throw new Error(`JWT purpose mismatch: expected '${opts.purpose}', got '${String(payload.purpose)}'`);
    }
    return payload as T;
}
