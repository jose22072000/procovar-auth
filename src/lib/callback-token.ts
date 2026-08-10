/**
 * Callback token: Double layer (JWT + Redis, single-use).
 *
 * Flow:
 *  1) External app calls POST /api/auth/callback-token (service-auth required)
 *     with { clientId, callbackUrl, returnTo? }.
 *  2) qb-auth validates against ClientApp allowlist.
 *  3) qb-auth stores payload in Redis under callback:{uuid} (TTL 5 min).
 *  4) qb-auth returns a JWT carrying ONLY the uuid (5 min expiry).
 *  5) External app redirects user to https://auth/?callback=JWT
 *  6) qb-auth /api/flow consumes the JWT, reads Redis, DELETES the key
 *     (single-use), and stores the validated payload in an httpOnly cookie
 *     keyed by the uuid for the rest of the auth session.
 */
import { randomUUID } from 'node:crypto';
import { signJwt, verifyJwt } from './jwt';
import { getRedis } from './redis';
import {
    validateCallbackPayload,
    type CallbackPayload,
    type ValidatedClient,
    CallbackValidationError,
} from './callback-validator';

const TTL_SECONDS = 5 * 60;
const PURPOSE = 'callback';
const REDIS_KEY = (id: string) => `callback:${id}`;

export interface StoredCallback extends CallbackPayload {
    issuedAt: number;
}

/** Step 1+2+3+4 above. Returns the signed JWT to put in the URL. */
export async function encodeCallback(
    payload: CallbackPayload
): Promise<{ token: string; expiresIn: number; client: ValidatedClient }> {
    const client = await validateCallbackPayload(payload);
    const id = randomUUID();
    const stored: StoredCallback = {
        clientId: payload.clientId,
        callbackUrl: payload.callbackUrl,
        returnTo: payload.returnTo ?? null,
        issuedAt: Date.now(),
    };
    await getRedis('sessions').set(REDIS_KEY(id), JSON.stringify(stored), 'EX', TTL_SECONDS);
    const token = await signJwt({ id }, {
        secretEnvVar: 'CALLBACK_SECRET',
        purpose: PURPOSE,
        expiresIn: '5m',
    });
    return { token, expiresIn: TTL_SECONDS, client };
}

/**
 * Verify+consume (single-use). Throws if the JWT is invalid or the Redis
 * key is missing (expired or replayed).
 */
export async function decodeCallback(token: string): Promise<StoredCallback> {
    const { id } = await verifyJwt<{ id: string }>(token, {
        secretEnvVar: 'CALLBACK_SECRET',
        purpose: PURPOSE,
    });
    if (!id) throw new CallbackValidationError('invalid_token', 'callback token missing id');

    const redis = getRedis('sessions');
    // Atomic GET+DEL: GETDEL is single-roundtrip and guarantees single-use.
    const raw = await redis.getdel(REDIS_KEY(id));
    if (!raw) throw new CallbackValidationError('replay_or_expired', 'callback token expired or already used');
    return JSON.parse(raw) as StoredCallback;
}

/** Verify a callback token without consuming it (debug only). */
export async function peekCallback(token: string): Promise<StoredCallback | null> {
    try {
        const { id } = await verifyJwt<{ id: string }>(token, {
            secretEnvVar: 'CALLBACK_SECRET',
            purpose: PURPOSE,
        });
        const raw = await getRedis('sessions').get(REDIS_KEY(id));
        return raw ? (JSON.parse(raw) as StoredCallback) : null;
    } catch {
        return null;
    }
}
