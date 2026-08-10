/**
 * qb-auth client SDK.
 *
 * Drop this single file into any Node/TypeScript microservice that needs to
 * talk to qb-auth. Only requires `node:crypto` (no external deps).
 *
 *   const client = new QbAuthClient({
 *     baseUrl:    process.env.QB_AUTH_URL!,           // https://qb-accounts.hostravel.com
 *     clientId:   process.env.QB_AUTH_CLIENT_ID!,     // 'qb-booking'
 *     signingKey: process.env.QB_AUTH_SIGNING_KEY!,   // hex, derived once during onboarding
 *     keyVersion: 1,                                   // optional, default 1
 *   });
 *
 *   const { token, redirectUrl } = await client.createCallbackToken({
 *     callbackUrl: 'https://qb-booking.hostravel.com/api/auth/callback',
 *     returnTo:    'https://qb-booking.hostravel.com/dashboard',
 *   });
 *
 *   const session = await client.exchangeCode(req.query.code as string);
 *   const session = await client.verifySession(cookieValue);
 *   await client.revokeSession({ sessionId });
 *   const { valid, ...info } = await client.verifyApiKey(req.headers['x-api-key']);
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';

export interface QbAuthClientOptions {
    baseUrl: string;
    clientId: string;
    /** hex, 64 chars (32 bytes). Derived from SERVICE_AUTH_SECRET on the qb-auth side. */
    signingKey: string;
    keyVersion?: number;
    /** Custom fetch (for tests / Node 18-). Defaults to globalThis.fetch. */
    fetch?: typeof fetch;
}

export interface CreateCallbackTokenInput {
    callbackUrl: string;
    returnTo?: string;
    /** Override clientId (only allowed for clients with `callback:any` scope). */
    clientId?: string;
}

export interface CreateCallbackTokenResult {
    token: string;
    expiresIn: number;
    redirectUrl: string;
}

export class QbAuthError extends Error {
    constructor(public status: number, public code: string, message: string, public details?: unknown) {
        super(message);
    }
}

export class QbAuthClient {
    constructor(private opts: QbAuthClientOptions) {
        if (!opts.baseUrl) throw new Error('baseUrl required');
        if (!opts.clientId) throw new Error('clientId required');
        if (!opts.signingKey || opts.signingKey.length !== 64) {
            throw new Error('signingKey must be a 64-char hex string');
        }
    }

    private get _fetch() {
        return this.opts.fetch ?? globalThis.fetch;
    }

    private sign(method: string, path: string, body: string): Record<string, string> {
        const ts = String(Math.floor(Date.now() / 1000));
        const nonce = randomBytes(16).toString('hex');
        const bodyHash = createHash('sha256').update(body).digest('hex');
        const stringToSign = [method.toUpperCase(), path, ts, nonce, bodyHash].join('\n');
        const sig = createHmac('sha256', Buffer.from(this.opts.signingKey, 'hex'))
            .update(stringToSign)
            .digest('hex');
        const headers: Record<string, string> = {
            'x-client-id': this.opts.clientId,
            'x-timestamp': ts,
            'x-nonce': nonce,
            'x-signature': sig,
            'content-type': 'application/json',
        };
        if (this.opts.keyVersion && this.opts.keyVersion !== 1) {
            headers['x-key-version'] = String(this.opts.keyVersion);
        }
        return headers;
    }

    private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
        const bodyStr = body == null ? '' : JSON.stringify(body);
        const url = new URL(path, this.opts.baseUrl);
        const fullPath = url.pathname + url.search;
        const headers = this.sign(method, fullPath, bodyStr);
        const res = await this._fetch(url.toString(), {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : bodyStr,
        });
        const text = await res.text();
        let parsed: unknown;
        try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
        if (!res.ok) {
            const p = parsed as { error?: string; message?: string };
            throw new QbAuthError(res.status, p.error ?? 'http_error', p.message ?? `HTTP ${res.status}`, parsed);
        }
        return parsed as T;
    }

    // ── Callback token (login flow) ─────────────────────────────────────
    createCallbackToken(input: CreateCallbackTokenInput): Promise<CreateCallbackTokenResult> {
        return this.call('POST', '/api/auth/callback-token', {
            clientId: input.clientId ?? this.opts.clientId,
            callbackUrl: input.callbackUrl,
            returnTo: input.returnTo,
        });
    }

    // ── Auth code exchange ──────────────────────────────────────────────
    exchangeCode(code: string): Promise<unknown> {
        return this.call('POST', '/api/auth/exchange', { code });
    }

    // ── Session ─────────────────────────────────────────────────────────
    verifySession(sessionToken: string): Promise<unknown> {
        return this.call('POST', '/api/auth/verify-session', { sessionToken });
    }

    revokeSession(input: { sessionId?: string; userId?: string }): Promise<{ revoked: number }> {
        return this.call('POST', '/api/auth/revoke-session', input);
    }

    // ── API keys ────────────────────────────────────────────────────────
    verifyApiKey(key: string): Promise<{ valid: boolean; id?: string; scopes?: string[] }> {
        return this.call('POST', '/api/auth/api-keys/verify', { key });
    }

    // ── Generic JWT signing/verification ────────────────────────────────
    signJwt(input: {
        purpose: string;
        claims: Record<string, unknown>;
        expiresIn?: string;
        audience?: string | string[];
    }): Promise<{ token: string }> {
        return this.call('POST', '/api/auth/sign', input);
    }

    verifyJwt(input: {
        token: string;
        purpose: string;
        audience?: string | string[];
    }): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
        return this.call('POST', '/api/auth/verify', input);
    }

    // ── Health ──────────────────────────────────────────────────────────
    health(): Promise<{ ok: boolean; redis: { ok: boolean }; db: { ok: boolean } }> {
        // Public, no signature needed — but it's harmless to send one.
        return this.call('GET', '/api/health');
    }
}
