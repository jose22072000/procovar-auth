/**
 * Auth code: opaque random token issued after a successful login,
 * exchanged by the external app via POST /api/auth/exchange.
 *
 *  - Stored in Redis under auth:code:{code} for 60s, single-use.
 *  - Bound to clientId + sessionId so an exchange request from the wrong
 *    client (or after the session is revoked) is rejected.
 *  - Code is opaque (NOT a JWT) so it carries no information by itself.
 */
import { randomBytes } from 'node:crypto';
import { getRedis } from './redis';

const TTL_SECONDS = 60;
const KEY = (code: string) => `auth:code:${code}`;

export interface AuthCodePayload {
    userId: string;
    sessionId: string;
    /** raw session token (cookie value) — needed by exchange endpoint to revalidate */
    sessionToken: string;
    clientId: string;
    callbackUrl: string;
    returnTo?: string | null;
}

function newCode(): string {
    // 32 bytes → 64 hex chars (256 bits of entropy, opaque)
    return randomBytes(32).toString('hex');
}

export async function createAuthCode(payload: AuthCodePayload): Promise<{ code: string; expiresIn: number }> {
    const code = newCode();
    await getRedis('sessions').set(KEY(code), JSON.stringify(payload), 'EX', TTL_SECONDS);
    return { code, expiresIn: TTL_SECONDS };
}

/**
 * Single-use consumption. The optional `expectedClientId` enforces that
 * only the issuing client can redeem the code.
 */
export async function consumeAuthCode(
    code: string,
    expectedClientId?: string
): Promise<AuthCodePayload | null> {
    if (!code || code.length < 32) return null;
    const raw = await getRedis('sessions').getdel(KEY(code));
    if (!raw) return null;
    const payload = JSON.parse(raw) as AuthCodePayload;
    if (expectedClientId && payload.clientId !== expectedClientId) {
        // Don't restore — treat as invalid (also acts as audit signal).
        return null;
    }
    return payload;
}
