# 🔐 QB Auth — Integration Guide

How to integrate **qb-auth** (Identity Hub) into any microservice or frontend
of the Divergtech ecosystem.

> Production endpoint: `https://qb-accounts.hostravel.com`
> Authoritative reference for internals: [`IDENTITY-HUB.md`](./IDENTITY-HUB.md)

---

## 0. TL;DR — Pick your integration mode

| Use case                                                          | Mode                            | Section |
| ----------------------------------------------------------------- | ------------------------------- | ------- |
| My **frontend / Next.js page** needs the user to log in           | **A. Login flow (callback)**    | §2      |
| My **backend** receives a session cookie and needs the user info  | **B. Verify session**           | §3      |
| My **backend → qb-auth** call (sign tokens, mint codes, admin…)   | **C. Service-to-service HMAC**  | §4      |
| My **backend → backend** call between *other* services using JWT  | **D. JWT sign + JWKS verify**   | §5      |
| External clients call my API with an API key                      | **E. API-key verification**     | §6      |

All modes share the same SDK file (~250 LOC, zero deps): copy
[`src/lib/sdk/qb-auth-client.ts`](../src/lib/sdk/qb-auth-client.ts) into your
project. For local JWT verification also copy
[`src/lib/sdk/qb-auth-jwks.ts`](../src/lib/sdk/qb-auth-jwks.ts) (requires
`jose`).

---

## 1. Onboarding a new microservice

Done **once** per service by the qb-auth admin.

### 1.1. Create a `ClientApp`

```bash
curl -X POST https://qb-accounts.hostravel.com/api/admin/clients \
  -H "Cookie: <admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "qb-myservice",
    "name": "My Service",
    "allowedCallbackUrls": ["https://qb-myservice.hostravel.com/api/auth/callback"],
    "allowedDomains":     ["qb-myservice.hostravel.com"],
    "scopes": ["session:verify", "callback:create"]
  }'
```

Response includes `signingKey` **once** — store it immediately, it is never
shown again. Available scopes:

| Scope             | Allows calling                          |
| ----------------- | --------------------------------------- |
| `session:verify`  | `POST /api/auth/verify-session`         |
| `session:revoke`  | `POST /api/auth/revoke-session`         |
| `callback:create` | `POST /api/auth/callback-token`         |
| `callback:any`    | …with arbitrary `clientId` (admin-only) |
| `apikey:verify`   | `POST /api/auth/api-keys/verify`        |
| `jwt:sign`        | `POST /api/auth/sign`                   |
| `jwt:verify`      | `POST /api/auth/verify`                 |
| `*`               | All of the above                        |

### 1.2. Set environment variables in your service

```bash
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=qb-myservice
QB_AUTH_SIGNING_KEY=<64-char hex from step 1.1>
QB_AUTH_KEY_VERSION=1
QB_AUTH_JWKS_CACHE_TTL_SECONDS=3600   # optional, default 3600
```

### 1.3. Drop the SDK

```bash
# from qb-auth repo root, inside your other service:
cp ../qb-auth/src/lib/sdk/qb-auth-client.ts  src/lib/qb-auth-client.ts
cp ../qb-auth/src/lib/sdk/qb-auth-jwks.ts    src/lib/qb-auth-jwks.ts   # optional, mode D
```

### 1.4. Initialize the singleton

```ts
// src/lib/qb-auth.ts
import { QbAuthClient } from './qb-auth-client';

export const qbAuth = new QbAuthClient({
    baseUrl:    process.env.QB_AUTH_URL!,
    clientId:   process.env.QB_AUTH_CLIENT_ID!,
    signingKey: process.env.QB_AUTH_SIGNING_KEY!,
    keyVersion: Number(process.env.QB_AUTH_KEY_VERSION ?? 1),
});
```

---

## 2. Mode A — Login flow (frontend / Next.js)

**Goal**: send the user to qb-accounts to authenticate, then come back with
a session cookie set on your subdomain.

### 2.1. Mint a callback token from your backend

```ts
// app/api/login/route.ts
import { qbAuth } from '@/lib/qb-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const { redirectUrl } = await qbAuth.createCallbackToken({
        callbackUrl: 'https://qb-myservice.hostravel.com/api/auth/callback',
        returnTo:    'https://qb-myservice.hostravel.com/dashboard',
    });
    return NextResponse.redirect(redirectUrl);
}
```

`redirectUrl` looks like `https://qb-accounts.hostravel.com/api/flow?callback=<jwt>`.

### 2.2. Implement the callback handler

```ts
// app/api/auth/callback/route.ts
import { qbAuth } from '@/lib/qb-auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const code = new URL(req.url).searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'missing code' }, { status: 400 });

    const session = await qbAuth.exchangeCode(code);
    // session = { user, session, memberships, sessionToken }

    // Set the cross-subdomain cookie (Better Auth-compatible).
    const res = NextResponse.redirect('https://qb-myservice.hostravel.com/dashboard');
    res.cookies.set('qb.session_token', session.sessionToken, {
        domain: '.hostravel.com',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
    });
    return res;
}
```

> **Note:** the callback token expires in **5 min**, the auth code in **60 s**,
> and both are single-use. Codes are bound to your `clientId` — another service
> cannot consume them.

### 2.3. Flow summary

```
Browser ──GET /login──▶  Your backend
                                  │  (1) qbAuth.createCallbackToken()
                                  ▼
                         qb-auth /api/auth/callback-token (HMAC)
                                  │  ◀── { token, redirectUrl }
                                  ▼
Browser ◀─302─ Your backend ─▶ qb-auth /api/flow?callback=<jwt>
                                  │  (Better Auth login UI)
                                  ▼
Browser ◀─302─ qb-auth /api/auth/callback ─▶ Your /api/auth/callback?code=<opaque>
                                  │  (2) qbAuth.exchangeCode(code)
                                  ▼
                         qb-auth /api/auth/exchange (HMAC)
                                  │  ◀── { user, session, sessionToken }
                                  ▼
Browser ◀─302─ Your /dashboard with qb.session_token cookie set
```

---

## 3. Mode B — Verify a session (any backend)

When a request arrives with the `qb.session_token` cookie, ask qb-auth who the
user is. Useful in middleware / route guards.

```ts
// middleware.ts or any route handler
import { qbAuth } from '@/lib/qb-auth';

const cookie = req.headers.get('cookie') ?? '';
const result = await qbAuth.verifySession(cookie);
// result = { valid: true, user, session, memberships } | { valid: false }

if (!result.valid) return new Response('Unauthorized', { status: 401 });
const { user, memberships } = result;
```

> Cache locally if you call this on every request (e.g. 30 s in-memory map by
> session token). qb-auth also caches internally but the network hop is the
> bottleneck.

To revoke a session (logout):

```ts
await qbAuth.revokeSession({ sessionId: session.id });
// or all sessions of a user:
await qbAuth.revokeSession({ userId: user.id });
```

---

## 4. Mode C — Calling qb-auth from your backend (HMAC)

Already shown in §2 and §3 — every method on `QbAuthClient` automatically
signs the request with HMAC-SHA256:

```
X-Client-Id     : qb-myservice
X-Timestamp     : 1745870400          # unix sec, |now-ts| ≤ 300 s
X-Nonce         : <base64 random>     # single-use, 5 min TTL in Redis
X-Key-Version   : 1
X-Signature     : <hex hmac>
```

Replay protection is enforced server-side. Nothing extra to do in your code.

### Custom calls (advanced)

If you need an endpoint not exposed by the SDK:

```ts
const res = await qbAuth.call('POST', '/api/auth/api-keys/verify', { key: '...' });
```

---

## 5. Mode D — Inter-service JWTs (RS256 + JWKS)

Use case: **service A** issues a token, **service B** verifies it without
calling qb-auth. Works for short-lived authorization tokens, webhooks,
event payloads, etc.

### 5.1. Sign a token (service A)

```ts
const { token, expiresIn } = await qbAuth.signJwt({
    purpose: 'invoice-export',                  // namespacing claim
    expiresIn: 600,                              // seconds, default 600
    audience: 'qb-back',                         // optional
    payload: { invoiceId: 'inv_123', userId: 'u_456' },
});
// token = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9.…"
```

### 5.2a. Verify by calling qb-auth (simple, rate-limited)

```ts
const claims = await qbAuth.verifyJwt(token, { purpose: 'invoice-export' });
// claims.payload = { invoiceId, userId, ... }
```

### 5.2b. Verify locally via JWKS (recommended)

```ts
import { createJwksVerifier } from '@/lib/qb-auth-jwks';

const verify = createJwksVerifier({
    baseUrl: process.env.QB_AUTH_URL!,
    // jwksPath:   '/.well-known/jwks.json'   // default
    // cacheMaxAgeMs: 3600_000                // default 1 h
});

const claims = await verify(token, { purpose: 'invoice-export' });
```

`createJwksVerifier` fetches the JWKS once and refreshes every 1 h. Key
rotation is picked up automatically as long as the old `kid` is still
present (revoke the old key only after the rotation grace period — recommended
≥ 1 h).

> **Why JWKS?** Zero round-trip per request, public-key crypto (no shared
> secret), works offline if the JWKS is cached.

---

## 6. Mode E — API-key verification (gateway pattern)

If your service exposes an API where third-party clients authenticate with an
API key (`qbk_live_<prefix>_<secret>`), delegate the check:

```ts
const apiKey = req.headers.get('x-api-key');
const result = await qbAuth.verifyApiKey(apiKey);
// result = { valid: true, id, prefix, scopes, clientId? } | { valid: false }

if (!result.valid) return new Response('Unauthorized', { status: 401 });
// Optionally enforce scopes:
if (!result.scopes?.includes('orders:read')) return new Response('Forbidden', { status: 403 });
```

API keys are created/revoked from the admin UI or via
`POST /api/admin/api-keys`.

---

## 7. Health check

Public, unauthenticated:

```bash
curl https://qb-accounts.hostravel.com/api/health
# { "status": "ok", "redis": true, "db": true }
```

Use it in your monitoring / Dokploy probes if needed.

---

## 8. Operational checklist

Before going to production with a new service:

- [ ] `ClientApp` created, `signingKey` stored in your secret manager.
- [ ] `allowedCallbackUrls` and `allowedDomains` exactly match what you use.
- [ ] All 4 `QB_AUTH_*` env vars set in Dokploy.
- [ ] SDK file (`qb-auth-client.ts`) committed to your repo.
- [ ] Login flow tested end-to-end on a staging subdomain.
- [ ] Session-cookie `domain` is `.hostravel.com` (so it works across services).
- [ ] If using JWKS verification: `jose` is in your dependencies.

---

## 9. Cookie sharing reminder

For seamless SSO, **all consumer services must run under the same root
domain** (`*.hostravel.com`). The cookie is set with:

```
domain=.hostravel.com; Secure; HttpOnly; SameSite=Lax
```

If your service runs on a different root (e.g. `*.example.com`), you cannot
share the cookie — you must do a fresh callback flow for each domain.

---

## 10. Troubleshooting

| Symptom                                                      | Likely cause                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `401 invalid_signature`                                      | Wrong `signingKey` or stale `keyVersion`. Re-fetch from admin and rotate via `/api/admin/clients/[id]/rotate-key`. |
| `401 timestamp_skew`                                         | Server clock drift > 5 min. Sync NTP.                                                     |
| `401 nonce_replayed`                                         | Two requests sharing the same nonce within 5 min. Should never happen with the SDK.       |
| `400 callback_url_not_allowed`                               | `callbackUrl` not in `allowedCallbackUrls`. Update the ClientApp.                         |
| `400 return_to_domain_mismatch`                              | `returnTo` host not in `allowedDomains`.                                                  |
| `404 invalid_code` on `exchangeCode`                         | Code already consumed, expired (60 s), or was minted for a different `clientId`.          |
| `401 jwks_kid_unknown` (local verify)                        | Consumer's JWKS cache is stale **and** the old kid was revoked. Restart consumer or wait `cacheMaxAgeMs`. |
| Session cookie set but `verifySession` returns `valid:false` | Cookie name typo (must be `qb.session_token`) or different cookie domain.                 |

---

## 11. Migrating from `BEARER_TOKEN` (legacy)

The legacy `Authorization: Bearer <BEARER_TOKEN>` flow is still accepted as a
fallback but logs a deprecation warning. Migration steps:

1. Onboard the service per §1.
2. Replace every `fetch(qbAuthUrl, { headers: { Authorization: 'Bearer ...' }})`
   with the corresponding SDK method.
3. Remove `BEARER_TOKEN` from your service env.
4. Once **all** consumers are migrated, the qb-auth admin removes
   `BEARER_TOKEN` from qb-auth's own env to disable the fallback entirely.

---

## 12. Where to read next

- [`IDENTITY-HUB.md`](./IDENTITY-HUB.md) — full architecture, Redis layout,
  endpoint reference, security properties.
- [`auth-center-prompt.md`](./auth-center-prompt.md) — original design brief.
- [`BOOKING-PAGE.md`](./BOOKING-PAGE.md) — concrete example: how qb-booking
  consumes qb-auth.
