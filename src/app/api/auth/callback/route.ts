/**
 * GET /api/auth/callback
 *
 * Hit after the user successfully authenticates. Reads the validated flow
 * cookie set by /api/flow, mints a single-use opaque auth code (Redis 60s)
 * containing the session token, and redirects the user to the original
 * callbackUrl with `?code=<auth_code>`.
 */
import { NextResponse } from 'next/server';
import { cookies, headers as nextHeaders } from 'next/headers';
import type { FlowOptions } from '@/lib/flow-state';
import { getSessionCookieName } from '@/lib/flow-state';
import { createAuthCode } from '@/lib/auth-code';
import { auth } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';

const DEFAULT_REDIRECT = '/profile';
const BASE_URL = process.env.APP_URL || 'http://localhost:3500';

export async function GET() {
    const cookieStore = await cookies();
    const flowCookie = cookieStore.get('qb.flow_state');
    let redirectUrl = DEFAULT_REDIRECT;
    let isExternal = false;

    try {
        if (flowCookie?.value) {
            const flow: FlowOptions = JSON.parse(flowCookie.value);

            if (flow.redirectOrigin && flow.origin?.startsWith('http')) {
                const sessionCookieName = getSessionCookieName();
                const sessionCookie = cookieStore.get(sessionCookieName);
                if (!sessionCookie?.value) {
                    redirectUrl = flow.origin;
                    isExternal = true;
                } else {
                    const session = await auth.api.getSession({ headers: await nextHeaders() });
                    if (!session) {
                        redirectUrl = flow.origin;
                        isExternal = true;
                    } else {
                        const { code } = await createAuthCode({
                            userId: session.user.id,
                            sessionId: session.session.id,
                            sessionToken: sessionCookie.value,
                            clientId: flow.clientId ?? 'unknown',
                            callbackUrl: flow.origin,
                            returnTo: (flow as { returnTo?: string }).returnTo ?? null,
                        });
                        const url = new URL(flow.origin);
                        url.searchParams.set('code', code);
                        redirectUrl = url.toString();
                        isExternal = true;
                        audit({
                            action: 'auth.code.create',
                            clientId: flow.clientId ?? null,
                            userId: session.user.id,
                            meta: { callbackUrl: flow.origin },
                        });
                    }
                }
            } else if (flow.origin) {
                redirectUrl = flow.origin;
            }
        }
    } catch (e) {
        logger.error('[auth/callback] error', { error: (e as Error).message });
    } finally {
        cookieStore.delete('qb.flow_state');
    }

    if (isExternal) return NextResponse.redirect(redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, BASE_URL));
}
