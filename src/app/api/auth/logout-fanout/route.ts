/**
 * GET /api/auth/logout-fanout?step=N&returnTo=...
 *
 * Multi-domain global sign-out coordinator.
 *
 *  step=0   → revoke session in qb-auth (DB + Better Auth cookie),
 *             then redirect to step=1.
 *  step=K   → redirect the user (top-level navigation, 1st-party for that
 *             host) to the K-th consumer's `/api/logout/clear?next=…`
 *             endpoint, where K-th comes from the deduped list of origins
 *             across every active ClientApp's `allowedCallbackUrls`.
 *  step=N+1 → redirect to `returnTo` (defaults to `/`).
 *
 * Why redirects and not <img> fan-out?
 *   Modern browsers block 3rd-party cookie writes (Safari ITP, Chrome 3PCD),
 *   so a hidden image cannot reliably clear another origin's cookie. A
 *   user-initiated top-level navigation is always 1st-party for the visited
 *   host and works everywhere.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { cookies, headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { listConsumerOrigins, validateConsumerUrl, hostFamily } from '@/lib/consumer-allowlist';

const SELF_BASE = process.env.APP_URL
    || process.env.APP_URL
    || 'http://localhost:3500';

/** True when qb-auth itself is running on localhost (dev mode). */
const SELF_IS_LOCAL = hostFamily(new URL(SELF_BASE).host) === 'local';

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const step = Math.max(0, Number(sp.get('step') ?? '0'));
    const rawReturnTo = sp.get('returnTo');
    const validated = await validateConsumerUrl(rawReturnTo);
    const returnTo = validated?.toString() ?? `${SELF_BASE}/`;

    // Caller origin: identifies which environment initiated the logout
    // (e.g. http://localhost:3600 vs https://qb-panel.hostravel.com).
    // We only walk through registered consumer origins that share its
    // scheme + host family. Falls back to the returnTo origin so a
    // mid-flight redirect (step >= 1) still has a reference point.
    const rawCaller = sp.get('caller');
    const validatedCaller =
        (await validateConsumerUrl(rawCaller)) ?? validated ?? new URL(SELF_BASE);

    // ── Step 0: revoke at hub + sign-out Better Auth ──────────────
    if (step === 0) {
        try {
            const session = await auth.api.getSession({ headers: await nextHeaders() });
            if (session) {
                audit({
                    action: 'auth.logout.fanout',
                    userId: session.user.id,
                    meta: { sessionId: session.session.id },
                });
            }
            await auth.api.signOut({ headers: await nextHeaders() }).catch(() => {});
        } catch (e) {
            logger.warn('[logout-fanout] step 0 ignored error', { error: (e as Error).message });
        }
        const next = new URL('/api/auth/logout-fanout', SELF_BASE);
        next.searchParams.set('step', '1');
        next.searchParams.set('returnTo', returnTo);
        next.searchParams.set('caller', validatedCaller.origin);
        return NextResponse.redirect(next);
    }

    // ── Steps 1..N: walk through each consumer ────────────────────
    const allOrigins = await listConsumerOrigins(validatedCaller);
    // On a production (non-localhost) server, skip localhost consumer origins:
    // they are dev-only entries and can never be reached by real end-user browsers.
    const origins = SELF_IS_LOCAL
        ? allOrigins
        : allOrigins.filter(o => hostFamily(new URL(o).host) !== 'local');
    const idx = step - 1;

    if (idx >= origins.length) {
        // ── Final: redirect to returnTo ─────────────────────────────
        const cookieStore = await cookies();
        cookieStore.delete('qb.flow_state');
        return NextResponse.redirect(returnTo);
    }

    const consumer = origins[idx];
    const nextHop = new URL('/api/auth/logout-fanout', SELF_BASE);
    nextHop.searchParams.set('step', String(step + 1));
    nextHop.searchParams.set('returnTo', returnTo);
    nextHop.searchParams.set('caller', validatedCaller.origin);

    const target = new URL('/api/logout/clear', consumer);
    target.searchParams.set('next', nextHop.toString());
    return NextResponse.redirect(target);
}
