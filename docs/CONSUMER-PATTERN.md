# 🔁 Multi-Domain Logout & Consumer Onboarding Pattern

This document captures the **end-to-end pattern** every consumer service
(qb-panel, qb-booking, qb-back UI, qb-notify UI, future templates, OTAs,
white-label apps…) must implement to plug into qb-auth, including the
multi-domain global sign-out flow.

> Companion to [`INTEGRATION-GUIDE.md`](./INTEGRATION-GUIDE.md) and
> [`CLIENT-INTEGRATION.md`](./CLIENT-INTEGRATION.md). Those describe the
> primitives; this one describes the **conventions** every service must
> follow so SSO and global logout work uniformly.

---

## 1. Onboarding (one-time, qb-auth side)

Add the consumer to [`prisma/seed.ts`](../prisma/seed.ts) `clients[]`:

```ts
{
    clientId: 'qb-myservice',
    name: 'QB My Service',
    description: 'Short purpose',
    allowedCallbackUrls: [
        'https://qb-myservice.hostravel.com/api/auth/callback',
        'http://localhost:3700/api/auth/callback',   // include the port!
    ],
    allowedDomains: ['qb-myservice.hostravel.com', 'localhost:3700'],
    scopes: ['callback:create', 'session:verify', 'session:revoke', 'auth:exchange'],
},
```

Then:

```bash
cd qb-auth
npx prisma db seed
```

Copy the printed `signingKey` (64 hex) into the consumer's `.env` as
`QB_AUTH_SIGNING_KEY`.

> ⚠️ **Port matters.** `allowedDomains` is matched against `URL.host`, which
> includes the port. `localhost` ≠ `localhost:3700`.

---

## 2. Consumer `.env` template

```bash
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=qb-myservice
QB_AUTH_SIGNING_KEY=<64-hex from seed output>
QB_AUTH_KEY_VERSION=1

APP_URL=https://qb-myservice.hostravel.com    # origin only, NO path

# Optional: only set if every consumer in this deployment shares one root.
# If unset → cookie is host-only (correct for multi-root deployments).
QB_SESSION_COOKIE_DOMAIN=.hostravel.com
```

---

## 3. Files to copy/implement in every consumer

| Path                          | Purpose                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `src/lib/qb-auth/client.ts`   | Copy from qb-auth `src/lib/sdk/qb-auth-client.ts`                    |
| `src/lib/qb-auth/index.ts`    | Singleton instantiating `QbAuthClient` from env                      |
| `src/lib/qb-auth/cookie.ts`   | Exports `QB_SESSION_COOKIE = 'qb.session_token'`, options helpers    |
| `src/lib/session.ts`          | `getSession()`, `destroySession()`, in-memory cache                  |

Cookie options must read `QB_SESSION_COOKIE_DOMAIN` from env (host-only when
unset). `destroySession()` must use `cookieStore.set(name, '', { maxAge: 0,
domain })` — **never** `cookieStore.delete(name)`, which drops the domain
attribute and leaves a stale cookie on the parent domain.

---

## 4. Required routes per consumer

| Route                                              | Behaviour |
| -------------------------------------------------- | --------- |
| `GET /api/login?returnTo=…`                        | `qbAuth.createCallbackToken({ callbackUrl, returnTo })` → 302 to `redirectUrl`. |
| `GET /api/auth/callback?code=…`                    | `qbAuth.exchangeCode(code)` → set cookie with **`exchange.sessionToken`** (the signed Better Auth cookie value, NOT `session.token` which is the raw DB token), redirect to **`exchange.returnTo`** (qb-auth persists it server-side; do NOT pass it as a query param). |
| `GET /api/logout?cancelUrl=…&returnTo=…`           | 302 to `${QB_AUTH_URL}/logout?cancelUrl=…&returnTo=…`. Defaults: `cancelUrl` = Referer, `returnTo` = `/`. Both must be absolute URLs. |
| `GET /api/logout/clear?next=…`                     | Validate `next` host against `new URL(QB_AUTH_URL).host`, `destroySession()`, redirect to `next`. This is what the fan-out walker calls. |

The proxy / middleware whitelist must include all four plus `/api/health`,
`/`, and any other public paths.

---

## 5. Login flow

```
Browser ──GET /api/login?returnTo=/foo──▶ Consumer
                                                │  qbAuth.createCallbackToken()
                                                ▼
                                   qb-auth /api/auth/callback-token (HMAC)
                                                │  ◀── { token, redirectUrl }
                                                ▼
Browser ◀──302── Consumer ─────▶ qb-auth /api/flow?callback=<jwt>
                                                │  (validates token, sets flow cookie)
                                                ▼
                                   qb-auth login UI (Better Auth)
                                                ▼
Browser ◀──302── qb-auth /api/auth/callback ─▶ Consumer /api/auth/callback?code=<opaque>
                                                │  qbAuth.exchangeCode(code)
                                                ▼
                                   qb-auth /api/auth/exchange (HMAC)
                                                │  ◀── { user, session, memberships, returnTo }
                                                ▼
Browser ◀──302── Consumer sets `qb.session_token` cookie → redirects to returnTo
```

Key contract: **`returnTo` survives end-to-end inside the auth code's Redis
payload**, not on the URL. The consumer never has to remember it across the
qb-accounts hop.

---

## 6. Logout flow (multi-domain global, with confirmation)

```
Click /api/logout (Consumer A)
        │
        ▼
Consumer A 302 → qb-auth /logout?cancelUrl=A&returnTo=A
        │
        ▼
qb-auth /logout (Server Component)
   - validates both URLs vs registered ClientApp origins
   - if user is signed-out: skip prompt, jump to fan-out
   - else: render "Sign out?" card
        │                                          │
        │ "No"                                     │ "Yes" (Server Action)
        ▼                                          ▼
   302 → cancelUrl                       revoke session at hub +
                                         Better Auth signOut
                                                   │
                                                   ▼
                                  302 → /api/auth/logout-fanout?step=1&returnTo=A
                                                   │
                                                   ▼
                                  for each origin in active ClientApp.allowedCallbackUrls:
                                       302 → ${origin}/api/logout/clear?next=…step=N+1…
                                                   │
                                                   ▼
                                  Final hop: 302 → returnTo
```

### Why a confirmation page?

- The same `/logout` URL works as a deep-link from any consumer.
- Users get a clear "this will sign you out everywhere" warning.
- Consumers don't have to ship duplicate confirmation modals.

### Why sequential redirects (not `<img>` fan-out)?

Modern browsers block 3rd-party cookie writes (Safari ITP, Chrome 3PCD), so
a hidden image cannot reliably clear another origin's cookie. A
user-initiated top-level navigation is always **1st-party for the visited
host** and works everywhere.

### Anti open-redirect

`cancelUrl`, `returnTo`, and the fan-out's per-step `next` are all validated
against the union of `allowedCallbackUrls` origins of every active
`ClientApp`. See [`src/lib/consumer-allowlist.ts`](../src/lib/consumer-allowlist.ts).

---

## 7. Files in qb-auth that drive the pattern

| File                                                                     | Role |
| ------------------------------------------------------------------------ | ---- |
| `src/lib/consumer-allowlist.ts`                                          | Builds and caches the allowed origins set; `validateConsumerUrl()`. |
| `src/app/(base)/logout/page.tsx`                                         | Confirmation UI (Server Component, plain Tailwind — no HeroUI). |
| `src/app/(base)/logout/_actions.ts`                                      | `confirmLogoutAction` Server Action: revoke + signOut + handoff to fan-out. |
| `src/app/api/auth/logout-fanout/route.ts`                                | Sequential walker through every consumer origin. |
| `src/app/api/auth/exchange/route.ts`                                     | Returns `returnTo` so consumers don't need to round-trip it. |
| `src/app/api/auth/callback/route.ts`                                     | Mints the opaque auth code embedding `returnTo`. |
| `src/app/(user)/page.tsx`                                                | Handles `?callback=JWT` by forwarding to `/api/flow`. |

---

## 8. Common pitfalls (battle-tested)

| Symptom                                                              | Fix |
| -------------------------------------------------------------------- | --- |
| `signingKey must be a 64-char hex string`                            | ClientApp not seeded yet, or `.env` still has the placeholder. Re-run `npx prisma db seed`. |
| `callbackUrl is not in allowlist for X`                              | URL not in `allowedCallbackUrls` (exact origin+path match). |
| `returnTo host not in allowedDomains for X`                          | Port missing in `allowedDomains` (e.g. needs `localhost:3600`, not just `localhost`). |
| Infinite `/api/login → /api/auth/callback → /api/login` loop         | Consumer is reading `exchange.session.token` (the raw DB token, not a valid cookie). Use `exchange.sessionToken` (the signed Better Auth cookie value). |
| Cookie set but next request says "no session"                        | Cookie name typo (must be `qb.session_token`) or wrong `domain` for the deployment. |
| `cookieStore.delete()` leaves a stale `.hostravel.com` cookie       | Use `cookieStore.set(name, '', { ...options, maxAge: 0, domain })` instead. |
| HeroUI components blow up in `/logout` page                          | Page is a Server Component (needs `searchParams`/`getSession`). Use plain Tailwind, or extract HeroUI into a Client Component child. |
| `?callback=JWT` ignored after login                                  | qb-auth root page must forward `?callback=…` to `/api/flow` (see `src/app/(user)/page.tsx`). |

---

## 9. Onboarding checklist (copy when adding a service)

- [ ] Entry added to `prisma/seed.ts` with prod + dev URLs (with ports).
- [ ] `npx prisma db seed` run; `signingKey` stored in consumer secrets.
- [ ] Consumer `.env` has `QB_AUTH_URL`, `QB_AUTH_CLIENT_ID`,
      `QB_AUTH_SIGNING_KEY`, `QB_AUTH_KEY_VERSION`, `APP_URL`.
- [ ] `QB_SESSION_COOKIE_DOMAIN` decided (set if all consumers share one root).
- [ ] `src/lib/qb-auth/{client,index,cookie}.ts` and `src/lib/session.ts` in place.
- [ ] All four routes implemented: `/api/login`, `/api/auth/callback`,
      `/api/logout`, `/api/logout/clear`.
- [ ] Proxy / middleware whitelist updated.
- [ ] Login + logout tested end-to-end against staging qb-accounts.
