import { prisma } from './prisma';

/**
 * Authoritative session-revocation check.
 *
 * better-auth's `getSession()` serves from its 1h cookie cache (auth.ts) and
 * never inspects our custom `Session.revokedAt` column, so a session revoked via
 * /api/auth/revoke-session would otherwise keep working until natural expiry for
 * every consumer that resolves sessions through `getSession()` (the admin routes
 * behind requireSystemAdmin, the dashboard actions, organizations/*, rbac/*, …).
 * Call this right after resolving a session and reject when it returns true.
 *
 * The DB `revokedAt` flag is the source of truth; the two verify-session routes
 * already perform this same query inline.
 */
export async function isSessionRevoked(sessionId: string | null | undefined): Promise<boolean> {
    if (!sessionId) return false;
    const row = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { revokedAt: true },
    });
    return !!row?.revokedAt;
}
