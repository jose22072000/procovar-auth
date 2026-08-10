/**
 * Verifier for the signed qb-auth `/logout` hand-off token.
 *
 * Counterpart to each consumer's `signLogoutToken()`. The HMAC key is
 * re-derived from the hub's `SERVICE_AUTH_SECRET` using the `clientId`
 * and `keyVersion` carried in the token header, so the hub never has to
 * store consumer signing keys at rest.
 *
 * Token format (see consumer `logout-token.ts`):
 *   base64url(header).base64url(payload).base64url(sig)
 *   header  = { alg:'HS256', cid, kv }
 *   payload = { cu, rt, exp }
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { deriveSigningKey } from './service-auth';
import { prisma } from './prisma';

export interface LogoutTokenPayload {
    cancelUrl: string;
    returnTo: string | null;
    clientId: string;
}

function b64urlDecode(s: string): string {
    return Buffer.from(s, 'base64url').toString('utf8');
}

export async function verifyLogoutToken(raw: string | null | undefined): Promise<LogoutTokenPayload | null> {
    if (!raw) return null;
    const parts = raw.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;

    let header: { alg?: string; cid?: string; kv?: number };
    let payload: { cu?: string; rt?: string | null; exp?: number };
    try {
        header = JSON.parse(b64urlDecode(h));
        payload = JSON.parse(b64urlDecode(p));
    } catch {
        return null;
    }

    if (header.alg !== 'HS256' || !header.cid) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.cu !== 'string') return null;

    // Make sure the client is still registered & active.
    const client = await prisma.clientApp.findUnique({
        where: { clientId: header.cid },
        select: { clientId: true, active: true, signingKeyVersion: true },
    });
    if (!client || !client.active) return null;

    const kv = Number(header.kv ?? 1);
    if (!Number.isInteger(kv) || kv < 1) return null;

    let signingKey: string;
    try {
        signingKey = deriveSigningKey(client.clientId, kv);
    } catch {
        return null;
    }

    const expected = createHmac('sha256', Buffer.from(signingKey, 'hex'))
        .update(`${h}.${p}`)
        .digest();
    let provided: Buffer;
    try {
        provided = Buffer.from(s, 'base64url');
    } catch {
        return null;
    }
    if (provided.length !== expected.length) return null;
    if (!timingSafeEqual(provided, expected)) return null;

    return {
        cancelUrl: payload.cu,
        returnTo: typeof payload.rt === 'string' ? payload.rt : null,
        clientId: client.clientId,
    };
}
