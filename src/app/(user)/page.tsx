import { SignInForm } from '@/components/forms/sign-in';
import { AccountView } from '@/components/account-view';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/server/auth.server';
import { redirect } from 'next/navigation';
import { getFlowState, decodeFlowOptions, buildExternalRedirectUrl, getSessionCookieName } from '@/lib/flow-state';
import { validateCallbackPayload, CallbackValidationError } from '@/lib/callback-validator';
import { resolveProfileRole } from '@/lib/role-resolver';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ op?: string; callback?: string; prompt?: string }>;
}) {
  const params = await searchParams;
  const op = params.op;
  const callback = params.callback;

  const userResponse = await getCurrentUser();
  const user = userResponse.data;

  // New flow: ?callback=JWT — always go through /api/flow to validate the
  // single-use token and persist the flow cookie before showing the UI.
  if (callback) {
    const promptQs = params.prompt === 'none' ? '&prompt=none' : '';
    redirect(`/api/flow?callback=${encodeURIComponent(callback)}${promptQs}`);
  }

  // If there's an op parameter
  if (op) {
    if (user) {
      // Already authenticated: decode the op directly and redirect to origin
      // without saving a cookie (avoids redirect loop with external apps)
      const options = await decodeFlowOptions(op);
      if (options?.redirectOrigin && options?.origin) {
        // SECURITY: validate the origin against the client's allowlist BEFORE
        // ever redirecting to it or minting an exchange code — the legacy ?op=
        // payload is attacker-controllable, so an unvalidated origin would leak
        // the session token to e.g. evil.com. Keep this outside try/catch below.
        let originAllowed = true;
        try {
          await validateCallbackPayload({
            clientId: options.clientId ?? '',
            callbackUrl: options.origin,
            returnTo: typeof options.returnTo === 'string' ? options.returnTo : undefined,
          });
        } catch (e) {
          const code = e instanceof CallbackValidationError ? e.code : 'invalid_callback';
          console.warn('[signin] legacy op external redirect rejected:', code);
          originAllowed = false;
        }
        if (originAllowed) {
          // External URL: include exchange code
          if (options.origin.startsWith('http')) {
            const cookieStore = await cookies();
            const sessionCookieName = getSessionCookieName();
            const sessionToken = cookieStore.get(sessionCookieName)?.value;
            if (sessionToken) {
              const redirectUrl = await buildExternalRedirectUrl(options.origin, sessionToken);
              redirect(redirectUrl);
            }
          }
          redirect(options.origin);
        }
        // origin not in the client's allowlist — fall through to the account
        // view instead of leaking the session token to an unvalidated origin.
      }
      // No redirectOrigin flag, just show the account view
    } else {
      // Not authenticated: save flow state and show login
      redirect(`/api/flow?op=${encodeURIComponent(op)}`);
    }
  }

  // If user is already authenticated and has a flow state with redirect flag,
  // redirect to callback handler which clears the cookie and redirects
  if (user) {
    const flowState = await getFlowState();
    if (flowState?.redirectOrigin && flowState?.origin) {
      redirect('/api/auth/callback');
    }
  }

  // Silent probe (prompt=none) with no IdP session: do NOT show a login form.
  // Bounce back to the calling app with ?sso=none so it renders as anonymous.
  // The bounce itself lives in /api/flow/none because it has to clear the flow
  // cookie, and Next only allows cookie writes from a server action or a route
  // handler — doing it here throws during render and returns a 500 instead.
  if (!user) {
    const flowState = await getFlowState();
    if (flowState?.prompt === 'none' && flowState?.origin) {
      redirect('/api/flow/none');
    }
  }

  const cookieStore = await cookies();
  const savedEmail = cookieStore.get("remember-email")?.value;

  return (
    <div className="">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <Suspense fallback={<div className="animate-pulse h-96 w-full max-w-md bg-muted rounded-sm" />}>
          {user ? (
            <AccountView user={user} role={await resolveProfileRole({ id: user.id, isSystemAdmin: user.isSystemAdmin ?? false })} />
          ) : (
            <SignInForm savedEmail={savedEmail} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
