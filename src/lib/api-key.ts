/**
 * API Keys for human/script access.
 *
 *  Format: qbk_<env>_<prefix8>_<secret48>
 *    e.g. qbk_live_a1b2c3d4_<hex>
 *  - `prefix8` is stored in DB (public, used to find the row in O(1)).
 *  - `secret48` is hashed with argon2id and never stored in plaintext.
 *  - Compare with timingSafeEqual after argon2 verify.
 *  - Soft-revoke via `revokedAt` (cheap to check, no row delete).
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { prisma } from './prisma';

const ENV_TAG = process.env.NODE_ENV === 'production' ? 'live' : 'test';

export interface CreateApiKeyInput {
    name: string;
    clientAppId?: string | null;
    userId?: string | null;
    scopes?: string[];
    expiresAt?: Date | null;
}

export interface CreatedApiKey {
    id: string;
    /** Plain-text key — shown ONCE, never persisted in this form. */
    key: string;
    prefix: string;
}

function genPrefix(): string {
    return randomBytes(4).toString('hex'); // 8 chars
}
function genSecret(): string {
    return randomBytes(24).toString('hex'); // 48 chars
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const prefix = genPrefix();
    const secret = genSecret();
    const key = `qbk_${ENV_TAG}_${prefix}_${secret}`;
    const hash = await argon2.hash(secret, { type: argon2.argon2id });
    const row = await prisma.apiKey.create({
        data: {
            prefix,
            hash,
            name: input.name,
            clientAppId: input.clientAppId ?? null,
            userId: input.userId ?? null,
            scopes: input.scopes ?? [],
            expiresAt: input.expiresAt ?? null,
        },
        select: { id: true },
    });
    return { id: row.id, key, prefix };
}

export interface VerifiedApiKey {
    id: string;
    prefix: string;
    name: string;
    scopes: string[];
    clientAppId: string | null;
    userId: string | null;
}

const KEY_RE = /^qbk_(live|test)_([a-f0-9]{8})_([a-f0-9]{48})$/i;

export async function verifyApiKey(rawKey: string): Promise<VerifiedApiKey | null> {
    const m = KEY_RE.exec(rawKey || '');
    if (!m) return null;
    const [, , prefix, secret] = m;

    const row = await prisma.apiKey.findUnique({
        where: { prefix },
        select: {
            id: true,
            prefix: true,
            hash: true,
            name: true,
            scopes: true,
            clientAppId: true,
            userId: true,
            revokedAt: true,
            expiresAt: true,
        },
    });
    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

    let ok: boolean;
    try {
        ok = await argon2.verify(row.hash, secret);
    } catch {
        return null;
    }
    if (!ok) return null;

    // Constant-time prefix compare (defense in depth)
    const a = Buffer.from(row.prefix);
    const b = Buffer.from(prefix);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    // Best-effort lastUsedAt update (don't await)
    prisma.apiKey
        .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

    return {
        id: row.id,
        prefix: row.prefix,
        name: row.name,
        scopes: row.scopes,
        clientAppId: row.clientAppId,
        userId: row.userId,
    };
}

export async function revokeApiKey(id: string): Promise<void> {
    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}
