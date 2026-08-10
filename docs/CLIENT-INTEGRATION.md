# 🔐 Client-side Integration with QB Auth

How a **browser app** (Next.js, React SPA, plain HTML) authenticates users
through **qb-auth** and stays signed-in across all `*.hostravel.com`
subdomains.

> Server-to-server traffic (your API calling qb-auth, or service A calling
> service B) is documented in [`BACKEND-INTEGRATION.md`](./BACKEND-INTEGRATION.md).
> This file focuses on what runs in the browser.

---

## 1. The mental model

- **There is one source of truth: qb-auth.** It owns the login UI, the user
  table, and the cross-subdomain session cookie.
- **Your client never holds a `signingKey` or any qb-auth secret.** All HMAC
  calls happen on your backend (Next.js Route Handlers, Express, etc.).
- **Single Sign-On is automatic** because the session cookie is set on
  `.hostravel.com`, so once the user logs in via qb-accounts, every other
  app under that root domain sees the cookie immediately.

```
┌──────────────────┐       ┌────────────────────┐        ┌────────────────────┐
│  Browser         │       │  Your service      │        │  qb-auth           │
│  (qb-myapp)      │       │  (Next.js backend) │        │  (Identity Hub)    │
└────────┬─────────┘       └─────────┬──────────┘        └─────────┬──────────┘
         │ click "Sign in"           │                              │
         │ ─────────────────────────▶│ /api/login                   │
         │                           │ qbAuth.createCallbackToken()  │
         │                           │ ────────────────────────────▶│
         │                           │ ◀── { redirectUrl }          │
         │ ◀──── 302 to redirectUrl ─┤                              │
         │                           │                              │
         │ ─────────────── 302 to qb-accounts (login UI) ──────────▶│
         │                           │                              │
         │ ◀──── 302 to /api/auth/callback?code=… ─────────────────│
         │                           │                              │
         │ ───────────────────────── ▶│ /api/auth/callback           │
         │                           │  qbAuth.exchangeCode(code)    │
         │                           │ ────────────────────────────▶│
         │                           │ ◀── { sessionToken, user }   │
         │ ◀── 302 + Set-Cookie ─────┤                              │
         │     (qb.session_token,                                   │
         │      domain=.hostravel.com)                             │
```

---

## 2. Quickstart for a Next.js consumer (client + backend)

### 2.1. Backend: two Route Handlers

```ts
// app/api/login/route.ts
import { qbAuth } from '@/lib/qb-auth';     // your QbAuthClient singleton
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const returnTo = url.searchParams.get('returnTo')
        ?? 'https://qb-myapp.hostravel.com/dashboard';

    const { redirectUrl } = await qbAuth.createCallbackToken({
        callbackUrl: 'https://qb-myapp.hostravel.com/api/auth/callback',
        returnTo,
    });
    return NextResponse.redirect(redirectUrl);
}
```

```ts
// app/api/auth/callback/route.ts
import { qbAuth } from '@/lib/qb-auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const returnTo = url.searchParams.get('returnTo')
        ?? 'https://qb-myapp.hostravel.com/dashboard';

    if (!code) return NextResponse.json({ error: 'missing code' }, { status: 400 });

    const { sessionToken } = await qbAuth.exchangeCode(code) as {
        sessionToken: string;
    };

    const res = NextResponse.redirect(returnTo);
    res.cookies.set('qb.session_token', sessionToken, {
        domain:   '.hostravel.com',   // ← THE key for SSO
        secure:   true,
        httpOnly: true,
        sameSite: 'lax',
        path:     '/',
        maxAge:   60 * 60 * 24 * 30,    // 30 days
    });
    return res;
}
```

### 2.2. Client: a sign-in button

```tsx
// components/sign-in-button.tsx
'use client';

export function SignInButton() {
    return (
        <a href={`/api/login?returnTo=${encodeURIComponent(location.href)}`}>
            Sign in
        </a>
    );
}
```

That's it — no JS SDK, no popups, just two redirects.

---

## 3. Reading the session in your client

The session cookie is **httpOnly**, so the browser cannot read it directly.
Two patterns:

### 3.1. SSR / Server Components (recommended)

```ts
// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { qbAuth } from '@/lib/qb-auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
    const sessionToken = (await cookies()).get('qb.session_token')?.value;
    if (!sessionToken) redirect('/api/login');

    const { valid, user } = await qbAuth.verifySession(sessionToken) as {
        valid: boolean;
        user?: { id: string; name: string; email: string };
    };
    if (!valid || !user) redirect('/api/login');

    return <h1>Hi {user.name}</h1>;
}
```

### 3.2. Client component → expose a `/api/me` endpoint

```ts
// app/api/me/route.ts
import { cookies } from 'next/headers';
import { qbAuth } from '@/lib/qb-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const token = (await cookies()).get('qb.session_token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 401 });

    const result = await qbAuth.verifySession(token);
    return NextResponse.json(result);
}
```

```tsx
// hooks/use-user.ts
'use client';
import useSWR from 'swr';

export function useUser() {
    const { data } = useSWR('/api/me', (u) => fetch(u).then(r => r.json()));
    return data?.user ?? null;
}
```

> **Do NOT call qb-auth directly from the browser.** It would require shipping
> the `signingKey` to the client.

---

## 4. Sign out

### 4.1. Local sign-out (this app only)

```ts
// app/api/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('qb.session_token', '', {
        domain: '.hostravel.com',
        maxAge: 0,
        path: '/',
    });
    return res;
}
```

### 4.2. Global sign-out (every hostravel.com app)

```ts
// app/api/logout/route.ts
import { qbAuth } from '@/lib/qb-auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
    const token = (await cookies()).get('qb.session_token')?.value;
    if (token) {
        const { session } = await qbAuth.verifySession(token) as {
            session?: { id: string };
        };
        if (session) await qbAuth.revokeSession({ sessionId: session.id });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set('qb.session_token', '', {
        domain: '.hostravel.com',
        maxAge: 0,
        path: '/',
    });
    return res;
}
```

This invalidates the session on the hub, so every other app's
`verifySession()` will return `{ valid: false }` on the next call.

---

## 5. Protected routes (Next.js middleware)

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/', '/login', '/api/login', '/api/auth/callback', '/api/health'];

export function middleware(req: NextRequest) {
    if (PUBLIC.some(p => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();

    const hasCookie = req.cookies.get('qb.session_token');
    if (!hasCookie) {
        const url = new URL('/api/login', req.url);
        url.searchParams.set('returnTo', req.nextUrl.toString());
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

> Middleware only checks **presence** of the cookie (cheap). Always re-verify
> the session in your handlers/Server Components for any sensitive action.

---

## 6. Calling your own backend from the browser

Once the cookie is set, every `fetch` to your same-origin (or `*.hostravel.com`)
backend will carry it automatically. **You do nothing special on the client.**

```tsx
// Same origin: cookie sent automatically
const data = await fetch('/api/orders').then(r => r.json());

// Other hostravel.com subdomain: must include credentials
const data = await fetch('https://qb-billing.hostravel.com/api/orders', {
    credentials: 'include',
}).then(r => r.json());
```

The receiving backend uses `qbAuth.verifySession(cookie)` to identify the
user. See §3.

---

## 7. CORS for cross-subdomain fetches

If your client at `https://qb-myapp.hostravel.com` calls a backend on a
different subdomain, configure CORS on **the backend**:

```ts
// next.config.ts (or middleware.ts)
const origin = req.headers.get('origin') ?? '';
if (/\.hostravel\.com$/.test(new URL(origin).hostname)) {
    res.headers.set('access-control-allow-origin', origin);
    res.headers.set('access-control-allow-credentials', 'true');
}
```

The cookie is `SameSite=Lax`, so navigation works out-of-the-box and
`fetch({ credentials: 'include' })` works between subdomains of the same
registrable domain.

---

## 8. Email verification & user-managed pages

qb-auth hosts these screens (you don't reimplement them):

| Page                          | URL                                                |
| ----------------------------- | -------------------------------------------------- |
| Sign in / Sign up             | `https://qb-accounts.hostravel.com/`              |
| Forgot password               | `https://qb-accounts.hostravel.com/forgot-password` |
| Reset password (link target)  | `https://qb-accounts.hostravel.com/reset-password` |
| Profile / sessions / 2FA      | `https://qb-accounts.hostravel.com/profile`       |
| Email verification banner     | shown automatically inside qb-accounts after signup |

If you want a "Manage account" link in your app:

```tsx
<a href="https://qb-accounts.hostravel.com/profile?returnTo=https://qb-myapp.hostravel.com/dashboard">
    Account settings
</a>
```

---

## 9. Things you must NEVER do on the client

1. **Embed `QB_AUTH_SIGNING_KEY` or any `*_SECRET` in client bundles.** They
   end up in the JS shipped to the browser. Always use `process.env.X` only
   inside server code.
2. **Call qb-auth HMAC endpoints directly from the browser.** The signature
   requires the secret. Always go through your backend.
3. **Set the session cookie without `httpOnly` and `Secure`.** XSS would steal
   it instantly.
4. **Use a different cookie name** like `session_token` without the `qb.`
   prefix. The hub and consumer libraries assume `qb.session_token`.
5. **Set `domain` to your subdomain** (e.g. `qb-myapp.hostravel.com`).
   Use `.hostravel.com` so SSO works.

---

## 10. Troubleshooting

| Symptom                                           | Fix                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Login completes but cookie isn't set              | `domain` must be `.hostravel.com`, scheme must be HTTPS, `Secure: true` |
| Cookie set but `verifySession` returns `valid:false` | Wrong cookie name (must be `qb.session_token`) or session was revoked |
| Logged in on `qb-accounts` but logged out on `qb-myapp` | Different root domain, or `domain=.hostravel.com` not set       |
| `400 callback_url_not_allowed`                    | Add the URL to `allowedCallbackUrls` of your `ClientApp`         |
| `400 return_to_domain_mismatch`                   | Add the host to `allowedDomains` of your `ClientApp`             |
| Infinite redirect loop                            | Middleware doesn't whitelist `/api/login` and `/api/auth/callback` |
| CORS error on cross-subdomain fetch               | Backend must echo `Access-Control-Allow-Credentials: true` and the explicit origin |
| Session works but dies after 30 days              | Default cookie `maxAge`. Bump it or rely on Better Auth refresh   |

---

## 11. Reference

- [`BACKEND-INTEGRATION.md`](./BACKEND-INTEGRATION.md) — server-side patterns,
  HMAC, JWT/JWKS.
- [`IDENTITY-HUB.md`](./IDENTITY-HUB.md) — full architecture & endpoint catalog.
- [`src/lib/sdk/qb-auth-client.ts`](../src/lib/sdk/qb-auth-client.ts) —
  the SDK your **backend** uses (never ship to the browser).
