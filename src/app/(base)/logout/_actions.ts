'use server';

import { redirect } from 'next/navigation';
import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { validateConsumerUrl } from '@/lib/consumer-allowlist';

const SELF_BASE = process.env.APP_URL
    || process.env.APP_URL
    || 'http://localhost:3500';

/**
 * Confirm sign-out from the central logout page.
 *
 *  - Records an audit event.
 *  - Signs the user out of Better Auth (clears the hub session cookie).
 *  - Hands off to the consumer fan-out walker, which will visit each
 *    registered consumer's /api/logout/clear and finally land on
 *    `returnTo`.
 *
 * `returnTo` MUST already be a validated absolute URL belonging to a
 * registered ClientApp; the page passes the validated value via a hidden
 * field, but we re-validate here as a defence-in-depth measure.
 */
export async function confirmLogoutAction(formData: FormData): Promise<void> {
    const rawReturnTo = formData.get('returnTo');
    const validated = await validateConsumerUrl(typeof rawReturnTo === 'string' ? rawReturnTo : null);
    const returnTo = validated?.toString() ?? `${SELF_BASE}/`;

    const rawCaller = formData.get('caller');
    const validatedCaller = await validateConsumerUrl(
        typeof rawCaller === 'string' ? rawCaller : null,
    );
    const callerOrigin = validatedCaller?.origin ?? null;

    try {
        const session = await auth.api.getSession({ headers: await nextHeaders() });
        if (session) {
            audit({
                action: 'auth.logout.confirm',
                userId: session.user.id,
                meta: { sessionId: session.session.id, returnTo, caller: callerOrigin },
            });
        }
        await auth.api.signOut({ headers: await nextHeaders() }).catch(() => {});
    } catch (e) {
        logger.warn('[logout/confirm] ignored error', { error: (e as Error).message });
    }

    const fanout = new URL('/api/auth/logout-fanout', SELF_BASE);
    // We already did step 0 (revoke + signOut) right here, so jump straight
    // to the consumer walker.
    fanout.searchParams.set('step', '1');
    fanout.searchParams.set('returnTo', returnTo);
    if (callerOrigin) fanout.searchParams.set('caller', callerOrigin);
    redirect(fanout.toString());
}
