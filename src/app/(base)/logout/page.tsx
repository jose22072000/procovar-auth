import { headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth';
import { validateConsumerUrl } from '@/lib/consumer-allowlist';
import { verifyLogoutToken } from '@/lib/logout-token';
import { getTranslations } from 'next-intl/server';

const SELF_BASE = process.env.APP_URL
    || process.env.APP_URL
    || 'http://localhost:3500';

interface SearchParams {
    /** Signed token (preferred) carrying cancelUrl + returnTo. */
    t?: string;
    /** Legacy plaintext params, still accepted for back-compat. */
    cancelUrl?: string;
    returnTo?: string;
    lang?: string;
}

/**
 * GET /logout?t=<signed-token>
 *     /logout?cancelUrl=...&returnTo=...   (legacy)
 *
 * Confirmation page shown by the central auth hub before performing a
 * global sign-out across every registered consumer domain.
 *
 * The signed token (`t`) is preferred: it bundles cancelUrl + returnTo
 * into an HMAC-authenticated blob so the URLs do not travel as plain
 * query string. We still origin-validate the decoded URLs against the
 * registered ClientApp allowlist as a defence-in-depth measure.
 *
 * If `t` is missing or invalid we fall back to the legacy plaintext
 * params so existing consumers keep working until they upgrade.
 */
export default async function LogoutPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;
    const t = await getTranslations();

    const verified = await verifyLogoutToken(params.t);
    const rawCancel = verified?.cancelUrl ?? params.cancelUrl;
    const rawReturn = verified?.returnTo ?? params.returnTo;

    const cancelTarget = await validateConsumerUrl(rawCancel);
    const returnTarget = await validateConsumerUrl(rawReturn);

    const cancelUrl = cancelTarget?.toString() ?? `${SELF_BASE}/`;
    const returnTo = returnTarget?.toString() ?? `${SELF_BASE}/`;

    // The verified token guarantees who the caller is. We propagate the
    // caller's origin to the fan-out so it walks only sibling hosts in
    // the caller's environment (e.g. localhost ↔ localhost,
    // .hostravel.com ↔ .hostravel.com), regardless of where the hub
    // itself is deployed.
    const callerOrigin = cancelTarget?.origin ?? returnTarget?.origin ?? null;

    // A link, not a form submit. The fan-out walks the browser through every
    // registered consumer's /api/logout/clear, and Chrome applies `form-action`
    // to each hop of that redirect chain — so a form could only work if the CSP
    // enumerated every consumer origin, which is a list that lives in the
    // database and changes as clients are registered. Confirming a logout is a
    // GET with three parameters; a link expresses that and is governed by
    // navigation rules instead.
    const fanoutUrl = (() => {
        const u = new URL("/api/auth/logout-fanout", SELF_BASE);
        u.searchParams.set("step", "0");
        u.searchParams.set("returnTo", returnTo);
        if (callerOrigin) u.searchParams.set("caller", callerOrigin);
        return u.pathname + u.search;
    })();
    const session = await auth.api.getSession({ headers: await nextHeaders() });
    const userName = session?.user?.name ?? session?.user?.email ?? null;

    return (
        <div className="flex min-h-svh items-center justify-center p-6">
            <div className="w-full max-w-md rounded-sm bg-content1 shadow-lg">
                <div className="flex flex-col gap-6 p-8">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-semibold">{t('logout.title')}</h1>
                        <p className="text-sm text-default-500">
                            {userName ? (
                                t('logout.descriptionSignedIn', { userName })
                            ) : (
                                t('logout.descriptionAnonymous')
                            )}
                        </p>
                    </div>

                    <div className="h-px w-full bg-divider" />

                    <div className="flex flex-col gap-3">
                        <a
                            href={fanoutUrl}
                            rel="nofollow"
                            className="w-full rounded-sm bg-danger px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-danger-500 active:scale-[0.98]"
                        >
                            {t('logout.confirm')}
                        </a>
                        <a
                            href={cancelUrl}
                            className="w-full rounded-sm bg-default-100 px-4 py-3 text-center text-sm font-medium text-foreground transition hover:bg-default-200"
                        >
                            {t('logout.cancel')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
