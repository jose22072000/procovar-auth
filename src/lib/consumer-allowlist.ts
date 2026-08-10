/**
 * Helpers for the qb-auth logout flow.
 *
 * Both `cancelUrl` (where the user goes if they say "No") and `returnTo`
 * (where they land after a successful sign-out) come from external
 * consumers, so they MUST be validated to prevent open-redirect abuse.
 *
 * Rule: the URL's `origin` must match the origin of one of the
 * `allowedCallbackUrls` registered for an active `ClientApp`.
 */
import 'server-only';
import { prisma } from './prisma';

let cache: { expires: number; origins: Set<string> } | null = null;
const TTL_MS = 30_000;

/**
 * Hostname family used to group origins by environment when no caller
 * origin is provided to the fan-out. We only fall back to this when the
 * call wasn't initiated by a verified consumer (defence-in-depth so the
 * hub doesn't blindly bounce through every registered host).
 *
 *  - "localhost" / "127.0.0.1" / "::1"   → "local"
 *  - any host containing a dot           → its registrable suffix
 *                                          (e.g. "hostravel.com" for
 *                                          "qb-panel.hostravel.com")
 */
export function hostFamily(host: string): string {
    const bare = host.split(':')[0].toLowerCase();
    if (bare === 'localhost' || bare === '127.0.0.1' || bare === '::1') return 'local';
    const parts = bare.split('.');
    if (parts.length <= 2) return bare;
    return parts.slice(-2).join('.');
}

async function loadAllowedOrigins(): Promise<Set<string>> {
    if (cache && cache.expires > Date.now()) return cache.origins;

    const clients = await prisma.clientApp.findMany({
        where: { active: true },
        select: { allowedCallbackUrls: true },
    });
    const origins = new Set<string>();
    for (const c of clients) {
        for (const raw of c.allowedCallbackUrls) {
            try {
                origins.add(new URL(raw).origin);
            } catch {
                // ignore malformed entries
            }
        }
    }
    cache = { expires: Date.now() + TTL_MS, origins };
    return origins;
}

/**
 * Returns the URL only if its origin is registered with at least one
 * active ClientApp; otherwise `null`. The path/query are preserved as-is.
 */
export async function validateConsumerUrl(raw: string | null | undefined): Promise<URL | null> {
    if (!raw) return null;
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return null;
    }
    const allowed = await loadAllowedOrigins();
    return allowed.has(url.origin) ? url : null;
}

/**
 * Returns the registered origins that share `caller`'s scheme and host
 * family. Used by the fan-out walker so a logout initiated from a given
 * environment (e.g. `http://localhost:3600`) only visits sibling hosts
 * in that same environment (e.g. other `http://localhost:*` consumers)
 * and never bounces through hosts from a different environment
 * (e.g. `https://*.hostravel.com`).
 *
 * The `caller` itself is always included if it's registered.
 */
export const listConsumerOrigins = async (caller: URL): Promise<string[]> => {
    const set = await loadAllowedOrigins();
    const callerScheme = caller.protocol;
    const callerFamily = hostFamily(caller.host);
    const out = new Set<string>();
    for (const origin of set) {
        try {
            const u = new URL(origin);
            if (u.protocol === callerScheme && hostFamily(u.host) === callerFamily) {
                out.add(origin);
            }
        } catch {
            // skip malformed
        }
    }
    // Always include the caller's own origin if it is registered.
    if (set.has(caller.origin)) out.add(caller.origin);
    return Array.from(out).sort();
};
