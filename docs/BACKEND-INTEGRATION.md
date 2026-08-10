# 🔐 Backend ↔ Backend via QB Auth

How two backend microservices authenticate and authorize each other through
**qb-auth** (Identity Hub). No shared bearer tokens, no service mesh required.

> This guide is **only** for server-to-server traffic. For browser/SPA flows
> see [`CLIENT-INTEGRATION.md`](./CLIENT-INTEGRATION.md).

---

## 1. The two patterns

| Pattern                                     | When                                                       | Latency               |
| ------------------------------------------- | ---------------------------------------------------------- | --------------------- |
| **A. HMAC direct call** to qb-auth          | A service needs qb-auth itself (verify session, mint code) | 1 round-trip          |
| **B. Hub-issued JWT (RS256 + JWKS)**        | Service A → Service B and B must trust A                   | 0 round-trips per req |

Use **A** every time you need data the hub owns (sessions, users, codes).
Use **B** every time service A wants to *vouch for itself* (or for a user) to
service B without B re-checking with the hub.

---

## 2. Pattern A — HMAC direct call (service → qb-auth)

Every backend that talks to qb-auth signs each request with HMAC-SHA256 using
its per-service `signingKey`. The SDK does this for you automatically.

### 2.1. Setup (one-time)

```bash
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=qb-back
QB_AUTH_SIGNING_KEY=<64-char hex>
QB_AUTH_KEY_VERSION=1
```

```ts
// src/lib/qb-auth.ts
import { QbAuthClient } from './qb-auth-client'; // copied from qb-auth/src/lib/sdk

export const qbAuth = new QbAuthClient({
    baseUrl:    process.env.QB_AUTH_URL!,
    clientId:   process.env.QB_AUTH_CLIENT_ID!,
    signingKey: process.env.QB_AUTH_SIGNING_KEY!,
    keyVersion: Number(process.env.QB_AUTH_KEY_VERSION ?? 1),
});
```

### 2.2. Calls available

```ts
// Verify a session cookie that arrived from a browser
const result = await qbAuth.verifySession(sessionToken);
//   → { valid, user, session, memberships }

// Logout (revoke one or all sessions of a user)
await qbAuth.revokeSession({ sessionId });
await qbAuth.revokeSession({ userId });

// Mint a callback-token to start the login flow (used by your /api/login)
const { token, redirectUrl } = await qbAuth.createCallbackToken({
    callbackUrl: 'https://qb-myservice.hostravel.com/api/auth/callback',
    returnTo:    'https://qb-myservice.hostravel.com/dashboard',
});

// Exchange the auth code received in your callback handler
const session = await qbAuth.exchangeCode(code);

// Verify a third-party API key
const { valid, scopes } = await qbAuth.verifyApiKey(apiKey);

// Sign / verify a JWT (delegated — see Pattern B below)
const { token } = await qbAuth.signJwt({ purpose: 'webhook', claims: { … } });
const { valid, payload } = await qbAuth.verifyJwt({ token, purpose: 'webhook' });
```

### 2.3. What goes on the wire

```
POST /api/auth/verify-session HTTP/1.1
host: qb-accounts.hostravel.com
content-type: application/json
x-client-id: qb-back
x-timestamp: 1745870400          # unix sec, |now-ts| ≤ 300 s
x-nonce:     5e1f…b4              # 16-byte random hex, single-use 5 min
x-key-version: 1                  # only if != 1
x-signature: <hex hmac-sha256>

{ "sessionToken": "qb.…" }
```

The string-to-sign is:
```
METHOD \n PATH \n TS \n NONCE \n sha256(body)
```

Replay protection: nonces are tracked in Redis with a 5-min TTL. Clock skew
is rejected past `SERVICE_AUTH_MAX_SKEW` seconds (default 300).

---

## 3. Pattern B — Service A vouches to Service B (RS256 + JWKS)

**Use case:** `qb-back` needs to call an internal endpoint of `qb-billing`
without sharing secrets with it. Instead of giving `qb-billing` a bearer token,
`qb-back` asks the hub to **mint a short-lived JWT**, sends it in
`Authorization: Bearer <jwt>`, and `qb-billing` verifies it **locally**
against the hub's JWKS.

### 3.1. Service A — sign

```ts
// qb-back: about to call qb-billing /api/internal/charge
const { token } = await qbAuth.signJwt({
    purpose: 'billing.charge',          // namespacing — REQUIRED
    audience: 'qb-billing',             // optional but recommended
    expiresIn: '60s',                   // keep them short
    claims: {
        userId: 'u_123',
        amount: 5000,
        currency: 'EUR',
    },
});

await fetch('https://qb-billing.hostravel.com/api/internal/charge', {
    method: 'POST',
    headers: {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
    },
    body: JSON.stringify({ orderId: 'o_456' }),
});
```

The hub stamps the JWT with:
- `kid` header → which public key to use (rotation-friendly)
- `iss` = qb-auth URL
- `purpose` = `svc:billing.charge` (auto-prefixed to prevent token confusion)
- `iss_client` = `qb-back` (who asked the hub to sign)
- `aud`, `exp`, `iat`, plus your `claims`.

### 3.2. Service B — verify locally (recommended)

```ts
// qb-billing: install jose, then ONCE at module load:
import { createJwksVerifier } from './qb-auth-jwks'; // copied from sdk

const verify = createJwksVerifier({
    baseUrl:        process.env.QB_AUTH_URL!,
    issuer:         process.env.QB_AUTH_URL!,        // optional, defaults to baseUrl
    cacheMaxAgeMs:  60 * 60_000,                     // optional, default 1 h
});

// Per-request:
const auth = req.headers.get('authorization') ?? '';
const token = auth.replace(/^Bearer\s+/i, '');

const claims = await verify(token, {
    purpose:  'billing.charge',         // MUST match what A used
    audience: 'qb-billing',             // optional
});
// claims = { userId, amount, currency, iss_client: 'qb-back', exp, … }

if (claims.iss_client !== 'qb-back') {
    return new Response('Forbidden', { status: 403 });
}
```

`createJwksVerifier` fetches `/.well-known/jwks.json` once and refreshes every
hour. Rotation is automatic as long as the old `kid` is still in the JWKS
(qb-auth admin should keep it for ≥ 1 h after rotating).

### 3.3. Service B — verify by calling the hub (alternative)

If you cannot or don't want to add `jose`:

```ts
const { valid, payload } = await qbAuth.verifyJwt({
    token,
    purpose: 'billing.charge',
});
if (!valid) return new Response('Unauthorized', { status: 401 });
```

This costs 1 round-trip per request. Use only for low-traffic endpoints.

### 3.4. Pattern B — full diagram

```
┌──────────┐                                  ┌──────────┐                  ┌──────────────┐
│  qb-back │                                  │ qb-auth  │                  │  qb-billing  │
└─────┬────┘                                  └────┬─────┘                  └──────┬───────┘
      │ POST /api/auth/sign  (HMAC)                │                                │
      │ { purpose, claims }                        │                                │
      │ ─────────────────────────────────────────▶ │                                │
      │ ◀── 200 { token: "eyJ..." }                │                                │
      │                                            │                                │
      │ POST /api/internal/charge                  │                                │
      │ Authorization: Bearer eyJ...               │                                │
      │ ───────────────────────────────────────────────────────────────────────────▶│
      │                                            │  GET /.well-known/jwks.json    │
      │                                            │  (only on cache miss, every 1h)│
      │                                            │ ◀──────────────────────────────│
      │                                            │ ───────────────────────────────▶│
      │                                            │                          (verify locally)
      │ ◀───────────────────────────────────────────────────────────────────── 200 OK
```

---

## 4. Choosing a `purpose`

The `purpose` claim is the **strongest defense against token confusion**: a
JWT minted for `webhook` cannot be replayed against an endpoint that expects
`billing.charge`. The hub auto-prefixes it with `svc:`, so:

| You write             | On the wire    | Verify with             |
| --------------------- | -------------- | ----------------------- |
| `billing.charge`      | `svc:billing.charge` | `verify(t, { purpose: 'billing.charge' })` |
| `webhook.signed-url`  | `svc:webhook.signed-url` | …                                          |
| `cron.invoice-export` | `svc:cron.invoice-export` | …                                          |

Convention: `<service>.<action>` in lowercase, kebab-case.

---

## 5. Scopes & permissions

Each `ClientApp` is provisioned with a list of scopes. To call qb-auth
endpoints from your service, your client needs the matching scope:

| Endpoint                                | Required scope    |
| --------------------------------------- | ----------------- |
| `/api/auth/verify-session`              | `session:verify`  |
| `/api/auth/revoke-session`              | `session:revoke`  |
| `/api/auth/callback-token`              | `callback:create` |
| `/api/auth/callback-token` (other client) | `callback:any`  |
| `/api/auth/api-keys/verify`             | `apikey:verify`   |
| `/api/auth/sign`                        | `jwt:sign`        |
| `/api/auth/verify`                      | `jwt:verify`      |
| `*`                                     | All of the above  |

The hub returns `403 forbidden_scope` if your client is missing a scope.

---

## 6. Rate limits & errors

| Endpoint                   | Bucket (capacity / refill)  |
| -------------------------- | --------------------------- |
| `/api/auth/callback-token` | 60 / 10 per second per client |
| Other service endpoints    | global hub-level limits      |

Common errors thrown by the SDK as `QbAuthError`:

```ts
try {
    await qbAuth.verifySession(token);
} catch (e) {
    if (e instanceof QbAuthError) {
        // e.status, e.code, e.message
    }
}
```

| `e.code`                    | Meaning                                   |
| --------------------------- | ----------------------------------------- |
| `invalid_signature`         | Wrong `signingKey` / `keyVersion`         |
| `timestamp_skew`            | Server clock drift > 5 min                |
| `nonce_replayed`            | Two requests with same nonce              |
| `forbidden_scope`           | Your `ClientApp` lacks the required scope |
| `invalid_code`              | Auth code expired, used, or wrong client  |
| `callback_url_not_allowed`  | URL not in `allowedCallbackUrls`          |
| `rate_limited`              | Token bucket exhausted, retry with delay  |
| `jwks_kid_unknown` (B/JWKS) | Old key revoked before consumer refreshed |

---

## 7. Operational checklist

- [ ] `ClientApp` exists for every service that calls qb-auth.
- [ ] `signingKey` stored only in your secrets manager (never logged).
- [ ] All clocks synced via NTP (skew window is 5 min).
- [ ] Each service uses **its own** `clientId` — do not share keys.
- [ ] For Pattern B: `purpose` is unique per use case, never reused.
- [ ] For Pattern B: `expiresIn` ≤ 5 min for high-frequency endpoints.
- [ ] JWKS consumers have `jose` installed and `QB_AUTH_URL` configured.
- [ ] On `signingKey` compromise: rotate via
      `POST /api/admin/clients/[id]/rotate-key` and bump `QB_AUTH_KEY_VERSION`.

---

## 8. References

- [`IDENTITY-HUB.md`](./IDENTITY-HUB.md) — full architecture & internals
- [`CLIENT-INTEGRATION.md`](./CLIENT-INTEGRATION.md) — browser/SPA flows
- [`src/lib/sdk/qb-auth-client.ts`](../src/lib/sdk/qb-auth-client.ts) — HMAC SDK source
- [`src/lib/sdk/qb-auth-jwks.ts`](../src/lib/sdk/qb-auth-jwks.ts) — JWKS verifier source
