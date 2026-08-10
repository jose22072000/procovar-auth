# 🔐 Identity Hub (qb-auth) — Architecture & Integration Guide

> qb-auth is the centralized **Identity & Security Hub**. All other microservices
> delegate authentication, session validation, API-key verification and JWT
> signing to this service.

## 1. Components

| File | Purpose |
| --- | --- |
| `src/lib/redis.ts` | ioredis Sentinel singleton (DBs: 4 default · 5 locks/rate-limit · 6 sessions · 7 cache) |
| `src/lib/jwt.ts` | Centralized HS256 sign/verify with `purpose` claim (anti-confusion) |
| `src/lib/callback-token.ts` | Login-flow callback token (JWT carries id, payload in Redis, single-use via `GETDEL`) |
| `src/lib/callback-validator.ts` | Strict allowlist (`ClientApp.allowedCallbackUrls`, `allowedDomains`) |
| `src/lib/auth-code.ts` | Opaque auth code (60s, single-use, bound to clientId) |
| `src/lib/service-auth.ts` | HMAC-SHA256 request signing + nonce/timestamp anti-replay |
| `src/lib/with-service-auth.ts` | Route wrapper enforcing service-auth + scopes (legacy Bearer fallback w/ deprecation warning) |
| `src/lib/api-key.ts` | argon2id-hashed API keys (`qbk_<env>_<prefix8>_<secret48>`) |
| `src/lib/rate-limit.ts` | Lua-based token-bucket in Redis |
| `src/lib/audit.ts` | Async fire-and-forget AuditLog writes |
| `src/lib/sdk/qb-auth-client.ts` | Self-contained SDK for microservices (only depends on `node:crypto`) |

## 2. Endpoints

### Public
- `GET  /api/health` — Redis + DB health.
- `GET  /api/flow?callback=<JWT>` — User entry point. Consumes callback token (single-use).
- `GET  /.well-known/jwks.json` — Public JWKS for RS256 signature verification.

### Service-auth required (HMAC headers)
- `POST /api/auth/callback-token` — Mint a callback token. Scope: `callback:create`.
- `POST /api/auth/exchange` — Redeem an auth code (code is bound to caller's clientId).
- `POST /api/auth/verify-session` — Validate a session cookie value. Scope: `session:verify`.
- `POST /api/auth/revoke-session` — Revoke by `sessionId` or all of `userId`. Scope: `session:revoke`.
- `POST /api/auth/api-keys/verify` — Validate an API key. Scope: `apikey:verify`.
- `POST /api/auth/sign` — Issue an **RS256** JWT (verifiable locally via JWKS). Scope: `jwt:sign`.
- `POST /api/auth/verify` — Server-side verify (prefer local verify via JWKS). Scope: `jwt:verify`.

### Admin (logged-in user with `isSystemAdmin = true`)
- `GET/POST /api/admin/clients`
- `POST     /api/admin/clients/:id/rotate-key`
- `GET/POST /api/admin/api-keys`
- `DELETE   /api/admin/api-keys/:id`
- `GET      /api/admin/jwks`             — list keypairs (public PEM only)
- `POST     /api/admin/jwks/rotate`      — mint a new active keypair
- `DELETE   /api/admin/jwks/:kid`        — revoke a keypair

## 3. Service-to-Service Auth (HMAC)

Every call carries 4 headers + signed body:

```
X-Client-Id   : qb-booking
X-Timestamp   : 1745870400          # unix sec, |now-ts| <= SERVICE_AUTH_MAX_SKEW (300)
X-Nonce       : <128-bit random>    # SETNX in Redis DB 5, anti-replay
X-Signature   : hex(HMAC_SHA256(signingKey, stringToSign))
X-Key-Version : 2                   # optional, default 1
```

`stringToSign = METHOD\nPATH(+query)\nTS\nNONCE\nsha256(body)`

The `signingKey` is **derived** server-side as
`HMAC_SHA256(SERVICE_AUTH_SECRET, "svc:v{version}:{clientId}")`.
The microservice receives this hex string once during onboarding.
Rotate a single client → bump `signingKeyVersion` (`POST /api/admin/clients/:id/rotate-key`).

## 4. Login Flow (double layer JWT + Redis)

```
1. App → POST /api/auth/callback-token { clientId, callbackUrl, returnTo }
        ← { token, redirectUrl }
2. App redirects user → https://qb-accounts.hostravel.com/?callback=TOKEN
3. /api/flow:
   - decodeCallback(token) → JWT verify + Redis GETDEL (single-use)
   - validate against ClientApp allowlist
   - store payload in httpOnly cookie qb.flow_state
4. User signs in (Better Auth)
5. /api/auth/callback:
   - read cookie, mint opaque auth code (Redis 60s, bound to clientId)
   - redirect → callbackUrl?code=XXXX
6. App → POST /api/auth/exchange { code }   (signed)
        ← { session, user, memberships }
```

## 5. SDK usage

```ts
import { QbAuthClient } from './sdk/qb-auth-client';

const qbAuth = new QbAuthClient({
  baseUrl:    process.env.QB_AUTH_URL!,           // https://qb-accounts.hostravel.com
  clientId:   process.env.QB_AUTH_CLIENT_ID!,     // 'qb-booking'
  signingKey: process.env.QB_AUTH_SIGNING_KEY!,   // hex (64 chars)
  keyVersion: Number(process.env.QB_AUTH_KEY_VERSION ?? 1),
});

// 1) Issue callback token before redirecting the user
const { redirectUrl } = await qbAuth.createCallbackToken({
  callbackUrl: 'https://qb-booking.hostravel.com/api/auth/callback',
  returnTo:    'https://qb-booking.hostravel.com/dashboard',
});
res.redirect(redirectUrl);

// 2) On callback, exchange code → session
const session = await qbAuth.exchangeCode(req.query.code);

// 3) On every protected request, verify cookie session
const session = await qbAuth.verifySession(req.cookies['__Secure-qb.session_token']);

// 4) Verify an API key from a third-party caller
const result = await qbAuth.verifyApiKey(req.headers['x-api-key']);

// 5) Sign / verify a one-shot inter-service JWT
const { token } = await qbAuth.signJwt({
  purpose: 'webhook:payload',
  claims:  { orderId: '123' },
  expiresIn: '5m',
  audience: 'qb-back',
});
```

### 5b. Local JWT verification (recommended)

Microservices that *only* need to verify JWTs (not call other endpoints)
should verify locally via the JWKS — zero round-trip:

```ts
import { createJwksVerifier } from './sdk/qb-auth-jwks'; // requires `jose`

const verify = createJwksVerifier({ baseUrl: process.env.QB_AUTH_URL! });

const { payload } = await verify(token, {
  purpose: 'webhook:payload',
  audience: 'qb-back',
});
// payload is fully validated (signature, exp, iss, aud, purpose)
```

The JWKS is fetched once and refreshed every 1 hour; key rotation is
picked up automatically as long as the old `kid` is still present (revoke
the old key only after the rotation grace period — recommended ≥ 1 h).

## 6. Dokploy environment variables

Add these to the qb-auth Dokploy app:

```
# Existing
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://qb-accounts.hostravel.com
APP_URL=https://qb-accounts.hostravel.com
ROOT_DOMAIN=hostravel.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NOTIFY_URL=https://qb-notify.hostravel.com/api

# Redis Sentinel
REDIS_MASTER_NAME=master
REDIS_SENTINELS=10.20.10.51:26379,10.20.10.52:26379,10.20.10.53:26379
REDIS_PASSWORD=...
REDIS_DB_DEFAULT=4
REDIS_DB_LOCKS=5
REDIS_DB_SESSIONS=6
REDIS_DB_CACHE=7
REDIS_PREFIX=qb-accounts:

# Identity Hub (NEW)
CALLBACK_SECRET=<32+ char random>
SERVICE_AUTH_SECRET=<32+ char random>
SERVICE_AUTH_MAX_SKEW=300

# JWKS / RS256 cache TTL (seconds). Default 3600 = 1 h. Min 60.
# Drives the in-process signer cache and the Cache-Control max-age
# of /.well-known/jwks.json (with stale-while-revalidate = 24x).
JWKS_CACHE_TTL_SECONDS=3600

# Legacy fallback (deprecated, will be removed)
BEARER_TOKEN=...
```

For each consuming microservice add:
```
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=<clientId>           # e.g. qb-booking
QB_AUTH_SIGNING_KEY=<64-char hex>      # printed by `tsx prisma/seed.ts` or admin endpoint
QB_AUTH_KEY_VERSION=1
QB_AUTH_JWKS_CACHE_TTL_SECONDS=3600    # optional, default 3600 = 1 h
```

## 7. Migrating existing services

1. Create `ClientApp` record (seed or `POST /api/admin/clients`) — capture `signingKey`.
2. Drop SDK file into the microservice; set the 4 env vars above.
3. Replace `Authorization: Bearer $BEARER_TOKEN` with `client.call(...)` (auto-signs).
4. Once all services migrated → remove `BEARER_TOKEN` from qb-auth env, the
   legacy fallback path will start rejecting requests.

## 8. Security properties recap

- Callback tokens: signed JWT (anti-tamper) + Redis (single-use, `GETDEL` atomic).
- Auth codes: opaque, 60s TTL, single-use, bound to clientId.
- Service auth: HMAC-SHA256, nonce SETNX (Redis DB 5), 5 min clock skew window.
- API keys: argon2id-hashed, soft-revocable, expirable.
- Inter-service JWTs: **RS256** signed by qb-auth, verified locally by consumers via JWKS.
  Rotation supported (old kid kept for grace period, then revoked).
- Token confusion: every JWT is namespaced by `purpose` claim (asserted on verify).
- Audit: every security-relevant action lands in `audit_log` (async, non-blocking).
- Rate-limit: per-clientId token bucket in Redis (configurable per endpoint).
- Defense: cross-subdomain cookies still managed by Better Auth.
