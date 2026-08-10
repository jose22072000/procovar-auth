/**
 * Strict allowlist validation for callback URLs and return URLs.
 * Validates against the ClientApp record stored in Postgres.
 */
import { prisma } from './prisma';

export interface CallbackPayload {
    clientId: string;
    callbackUrl: string;
    returnTo?: string | null;
}

export interface ValidatedClient {
    id: string;
    clientId: string;
    name: string;
    allowedCallbackUrls: string[];
    allowedDomains: string[];
    scopes: string[];
}

export class CallbackValidationError extends Error {
    constructor(public code: string, message: string) {
        super(message);
    }
}

function safeUrl(raw: string): URL | null {
    try {
        return new URL(raw);
    } catch {
        return null;
    }
}

/**
 * Match callbackUrl against allowlist. Exact match on origin+pathname is required.
 * Query/hash on allowlist entries are ignored.
 */
function matchesCallback(allowed: string[], candidate: URL): boolean {
    return allowed.some((entry) => {
        const a = safeUrl(entry);
        if (!a) return false;
        return a.origin === candidate.origin && a.pathname === candidate.pathname;
    });
}

/**
 * Match domain (used for returnTo). returnTo must be on an allowed domain
 * (host equals or is subdomain of an allowed entry).
 */
function matchesDomain(allowed: string[], candidate: URL): boolean {
    return allowed.some((entry) => {
        const host = entry.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return candidate.host === host || candidate.host.endsWith('.' + host);
    });
}

/**
 * A host is a trusted tenant callback host when it is an `active` TenantDomain
 * registered for this client. This is the dynamic complement to the static
 * `allowedCallbackUrls` / `allowedDomains` lists.
 */
async function isActiveTenantHost(clientId: string, host: string): Promise<boolean> {
    const found = await prisma.tenantDomain.findFirst({
        where: { clientId, host: host.toLowerCase(), active: true },
        select: { id: true },
    });
    return Boolean(found);
}

export async function loadActiveClient(clientId: string): Promise<ValidatedClient | null> {
    const c = await prisma.clientApp.findFirst({
        where: { clientId, active: true },
        select: {
            id: true,
            clientId: true,
            name: true,
            allowedCallbackUrls: true,
            allowedDomains: true,
            scopes: true,
        },
    });
    return c ?? null;
}

export async function validateCallbackPayload(payload: CallbackPayload): Promise<ValidatedClient> {
    if (!payload.clientId) throw new CallbackValidationError('missing_client_id', 'clientId is required');
    if (!payload.callbackUrl) throw new CallbackValidationError('missing_callback', 'callbackUrl is required');

    const client = await loadActiveClient(payload.clientId);
    if (!client) throw new CallbackValidationError('unknown_client', `Unknown clientId: ${payload.clientId}`);

    const cb = safeUrl(payload.callbackUrl);
    if (!cb || !['http:', 'https:'].includes(cb.protocol)) {
        throw new CallbackValidationError('invalid_callback_url', 'callbackUrl is not a valid http(s) URL');
    }
    if (!matchesCallback(client.allowedCallbackUrls, cb)) {
        const tenantOk =
            cb.pathname === '/api/auth/callback' &&
            (await isActiveTenantHost(client.clientId, cb.host));
        if (!tenantOk) {
            throw new CallbackValidationError('callback_not_allowed', `callbackUrl is not in allowlist for ${client.clientId}`);
        }
    }

    if (payload.returnTo) {
        const rt = safeUrl(payload.returnTo);
        if (!rt || !['http:', 'https:'].includes(rt.protocol)) {
            throw new CallbackValidationError('invalid_return_to', 'returnTo is not a valid http(s) URL');
        }
        if (!matchesDomain(client.allowedDomains, rt) && !(await isActiveTenantHost(client.clientId, rt.host))) {
            throw new CallbackValidationError('return_to_not_allowed', `returnTo host not in allowedDomains for ${client.clientId}`);
        }
    }

    return client;
}
