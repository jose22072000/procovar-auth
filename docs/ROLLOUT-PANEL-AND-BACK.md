# 🚀 QB Auth — Rollout Plan for `qb-panel` and `qb-back`

Step-by-step checklist to wire **qb-panel** and **qb-back** to the new
Identity Hub (`qb-auth`). Includes what is already provisioned, what you
must create, and the exact env vars to paste in Dokploy.

> Date: 2026-04-28 — qb-auth deployed at `https://qb-accounts.hostravel.com`.

---

## 0. Status snapshot — what's already created in qb-auth

| Item | Status | Notes |
| --- | --- | --- |
| `ClientApp` **`qb-back`** | ✅ Seeded | scopes: `session:verify`, `session:revoke`, `apikey:verify`, `jwt:sign`, `jwt:verify` |
| `ClientApp` **`qb-booking`** | ✅ Seeded | scopes: `callback:create`, `session:verify`, `auth:exchange` |
| `ClientApp` **`qb-panel`** | ❌ **Missing — you must create it** (see §2) |
| `ClientApp` **`qb-admin`** (super-client, scope `*`) | ❌ **Missing — optional but recommended** (see §4) |
| `JWKS` keypair (RS256) | ✅ Auto-bootstraps on first call to `/.well-known/jwks.json` or `/api/auth/sign` |
| Redis Sentinel | ✅ Configured (`10.20.10.51-53:26379`, prefix `qb-accounts:`) |
| Legacy `BEARER_TOKEN` fallback | ✅ Still active (deprecation warning logged) |

> Important: there is **NO single "admin API key for all projects"** by design.
> Each microservice has its own HMAC `signingKey`. If you need a programmatic
> admin client, create `qb-admin` (§4) — it's the closest equivalent.

---

## 1. Pre-derived signing keys (deterministic from `SERVICE_AUTH_SECRET`)

Use these values **as-is** — they are the result of
`HMAC_SHA256(SERVICE_AUTH_SECRET, "svc:v1:<clientId>")`:

```
qb-back    → 92a6e2763f83169d6ee29d5cf8b4a69a1a663a569cee2f6d44112fc31ef119b4
qb-panel   → 9e61d604769972c195d589bc0766122096ba997841f9a5f22007add28ba8faf4
qb-booking → b9e467c6dcc43a19b91f1b4535ab3d75c0e97cca29615e065137b8838e0f7cd8
qb-admin   → 4fd0128079dfbd0f8ce384d36002372127409be42d446ffc19412ea925e41dd8
```

> Treat each row as a top-tier secret: store in Dokploy / your secrets manager,
> never commit, never log.

---

## 2. Create the missing `ClientApp`s (one-time)

You need to be logged in to `https://qb-accounts.hostravel.com/` as a
**system-admin** user. Then either use the admin UI or run these `curl`s:

### 2.1. `qb-panel`

```bash
curl -X POST https://qb-accounts.hostravel.com/api/admin/clients \
  -H "Cookie: qb.session_token=<paste your admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "qb-panel",
    "name": "QB Panel (Admin Dashboard)",
    "description": "Internal admin & ops panel",
    "allowedCallbackUrls": [
      "https://qb-panel.hostravel.com/api/auth/callback",
      "http://localhost:3600/api/auth/callback"
    ],
    "allowedDomains": ["qb-panel.hostravel.com", "localhost"],
    "scopes": [
      "session:verify",
      "session:revoke",
      "apikey:verify",
      "jwt:sign",
      "jwt:verify",
      "callback:create"
    ]
  }'
```

Expected response: `201 Created` with `{ clientId, signingKey, ... }`. The
returned `signingKey` will match the value in §1 (deterministic). Store it.

### 2.2. (Optional but recommended) `qb-admin` — the super-client

A single programmatic client with scope `*`, used by internal tooling /
scripts that need to administrate the hub without a human session cookie.

```bash
curl -X POST https://qb-accounts.hostravel.com/api/admin/clients \
  -H "Cookie: qb.session_token=<paste your admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "qb-admin",
    "name": "Admin Operations",
    "description": "Programmatic admin access from internal tools",
    "allowedCallbackUrls": [],
    "allowedDomains": [],
    "scopes": ["*"]
  }'
```

⚠️ Treat `qb-admin` like a root credential. Use only in qb-panel server-side
code (never in browser bundles). Rotate via
`POST /api/admin/clients/qb-admin/rotate-key` if compromised.

---

## 3. `qb-back` — env block (Dokploy)

`qb-back` already has a `ClientApp` provisioned. You only need to **replace
the placeholder** in its env:

```bash
# ── QB Auth (Identity Hub) ───────────────────────────────
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=qb-back
QB_AUTH_SIGNING_KEY=92a6e2763f83169d6ee29d5cf8b4a69a1a663a569cee2f6d44112fc31ef119b4
QB_AUTH_KEY_VERSION=1

# Optional — local JWT verification cache
QB_AUTH_JWKS_CACHE_TTL_SECONDS=3600

# Keep until full migration completes, then DELETE from all 3 projects:
BEARER_TOKEN=a5216f4e092fdfca7ea894dcebcf5647b65f9ffee8a05151072f1821d9d9d4f5
```

### Code work in `qb-back`
1. Copy [`src/lib/sdk/qb-auth-client.ts`](../src/lib/sdk/qb-auth-client.ts)
   into `qb-back/src/lib/qb-auth-client.ts`.
2. (Optional) Copy [`src/lib/sdk/qb-auth-jwks.ts`](../src/lib/sdk/qb-auth-jwks.ts)
   if you'll verify JWTs from other services locally.
3. Initialize singleton:
   ```ts
   // qb-back/src/lib/qb-auth.ts
   import { QbAuthClient } from './qb-auth-client';

   export const qbAuth = new QbAuthClient({
       baseUrl:    process.env.QB_AUTH_URL!,
       clientId:   process.env.QB_AUTH_CLIENT_ID!,
       signingKey: process.env.QB_AUTH_SIGNING_KEY!,
       keyVersion: Number(process.env.QB_AUTH_KEY_VERSION ?? 1),
   });
   ```
4. Replace any `Authorization: Bearer ${BEARER_TOKEN}` calls to qb-auth with
   `qbAuth.verifySession(...)`, `qbAuth.exchangeCode(...)`, etc.
5. For session-protected endpoints, use:
   ```ts
   const cookie = req.headers.get('cookie') ?? '';
   const result = await qbAuth.verifySession(cookie);
   if (!result.valid) return new Response('Unauthorized', { status: 401 });
   ```

---

## 4. `qb-panel` — env block (Dokploy)

After running step §2.1, paste:

```bash
# ── QB Auth (Identity Hub) ───────────────────────────────
QB_AUTH_URL=https://qb-accounts.hostravel.com
QB_AUTH_CLIENT_ID=qb-panel
QB_AUTH_SIGNING_KEY=9e61d604769972c195d589bc0766122096ba997841f9a5f22007add28ba8faf4
QB_AUTH_KEY_VERSION=1
QB_AUTH_JWKS_CACHE_TTL_SECONDS=3600

# ── (Optional) Admin super-client — only if you ran §2.2 ──
QB_ADMIN_CLIENT_ID=qb-admin
QB_ADMIN_SIGNING_KEY=4fd0128079dfbd0f8ce384d36002372127409be42d446ffc19412ea925e41dd8
QB_ADMIN_KEY_VERSION=1

# Legacy fallback (keep until full migration, then delete):
BEARER_TOKEN=a5216f4e092fdfca7ea894dcebcf5647b65f9ffee8a05151072f1821d9d9d4f5
```

### Code work in `qb-panel`
1. Copy [`src/lib/sdk/qb-auth-client.ts`](../src/lib/sdk/qb-auth-client.ts)
   into `qb-panel/src/lib/qb-auth-client.ts`.
2. Init two singletons (one for normal traffic, one for admin actions):
   ```ts
   // qb-panel/src/lib/qb-auth.ts
   import { QbAuthClient } from './qb-auth-client';

   export const qbAuth = new QbAuthClient({
       baseUrl:    process.env.QB_AUTH_URL!,
       clientId:   process.env.QB_AUTH_CLIENT_ID!,
       signingKey: process.env.QB_AUTH_SIGNING_KEY!,
       keyVersion: Number(process.env.QB_AUTH_KEY_VERSION ?? 1),
   });

   export const qbAdmin = process.env.QB_ADMIN_SIGNING_KEY
       ? new QbAuthClient({
             baseUrl:    process.env.QB_AUTH_URL!,
             clientId:   process.env.QB_ADMIN_CLIENT_ID!,
             signingKey: process.env.QB_ADMIN_SIGNING_KEY!,
             keyVersion: Number(process.env.QB_ADMIN_KEY_VERSION ?? 1),
         })
       : null;
   ```
3. Implement the login flow (`/api/login` + `/api/auth/callback`) following
   [`CLIENT-INTEGRATION.md §2`](./CLIENT-INTEGRATION.md).
4. Use `qbAdmin` only for admin endpoints (creating clients, rotating keys,
   issuing API keys, JWKS rotation, etc.).

---

## 5. Verification — smoke tests

After deploying both services with the env block above:

```bash
# 1. qb-auth health
curl https://qb-accounts.hostravel.com/api/health
#   → { "status":"ok", "redis":true, "db":true }

# 2. JWKS exists (auto-bootstraps if first call)
curl https://qb-accounts.hostravel.com/.well-known/jwks.json
#   → { "keys":[ { "kid": "...", "kty":"RSA", ... } ] }

# 3. From qb-back container, sign a test JWT (uses HMAC under the hood)
node -e "
import('./src/lib/qb-auth.js').then(async ({ qbAuth }) => {
  const r = await qbAuth.signJwt({
    purpose: 'smoke-test',
    expiresIn: '60s',
    claims: { hello: 'world' },
  });
  console.log(r);
});"

# 4. Verify it from qb-panel container
node -e "
import('./src/lib/qb-auth.js').then(async ({ qbAuth }) => {
  const r = await qbAuth.verifyJwt({
    token: '<paste token from step 3>',
    purpose: 'smoke-test',
  });
  console.log(r);
});"
```

If any step fails, see the troubleshooting table in
[`BACKEND-INTEGRATION.md §6`](./BACKEND-INTEGRATION.md).

---

## 6. Cleanup checklist

Once both projects are deployed and the smoke tests pass:

- [ ] qb-back: replaced `__PASTE_64_HEX_FROM_ADMIN__` with the real key.
- [ ] qb-panel: replaced `__PASTE_64_HEX_FROM_ADMIN__` with the real key.
- [ ] qb-panel: created `qb-admin` super-client (optional).
- [ ] Both services: SDK file (`qb-auth-client.ts`) committed.
- [ ] Both services: at least one route uses `qbAuth.*` instead of
      `Authorization: Bearer ${BEARER_TOKEN}`.
- [ ] Login flow tested on a staging subdomain.
- [ ] `qb.session_token` cookie set with `domain=.hostravel.com`.
- [ ] `BEARER_TOKEN` removed from all 3 projects' env (qb-auth, qb-back,
      qb-panel) **only after** every consumer has migrated.

---

## 7. Quick reference

| Need | Read |
| --- | --- |
| Backend ↔ qb-auth (HMAC), backend ↔ backend (JWT/JWKS) | [`BACKEND-INTEGRATION.md`](./BACKEND-INTEGRATION.md) |
| Browser/SPA login flow, cookie sharing, sign-out, middleware | [`CLIENT-INTEGRATION.md`](./CLIENT-INTEGRATION.md) |
| Generic integration overview (all modes, scopes, errors) | [`INTEGRATION-GUIDE.md`](./INTEGRATION-GUIDE.md) |
| Architecture, Redis layout, full endpoint catalog | [`IDENTITY-HUB.md`](./IDENTITY-HUB.md) |
| Original design brief | [`auth-center-prompt.md`](./auth-center-prompt.md) |
