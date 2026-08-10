# Global SSO for multi-tenant custom domains — Design

- **Date:** 2026-06-04
- **Status:** Approved (design) — pending implementation plans per phase
- **Scope:** qb-auth (IdP), Qb-Property-Template, qb-panel, QuickBookTravelFrontend
- **Owner:** platform / auth

## 1. Problem

qb-auth is the single identity provider. Today every consumer integrates SSO with **environment-pinned configuration**:

- `callbackUrl` / `returnTo` are built from a hardcoded app URL (`NEXT_PUBLIC_APP_URL`).
- The session cookie domain is hardcoded (e.g. `.divergtech.com` in Qb-Property-Template's callback route).
- qb-auth validates `callbackUrl`/`returnTo` against a **static per-client allowlist** (`ClientApp.allowedCallbackUrls` / `allowedDomains`).

We now need authentication to work on **arbitrary owner custom domains** (e.g. `dozzze-romeo.com`) served by a **single multi-tenant Qb-Property-Template app**. Custom domains are reverse-proxied by nginx to `sites.hostravel.net`; the browser stays on the custom domain and the Next app receives the original host. Each new domain currently would require manual edits to env/allowlist — which does not scale and is the dependency we want to remove.

We also want a **uniform** integration shared by all three web consumers (qb-panel, QuickBookTravelFrontend, Qb-Property-Template), and a path to **global SSO** (one login recognized across all domains).

### Current flow (for reference)

```
Consumer /api/login → qbAuth.createCallbackToken({callbackUrl, returnTo})   [HMAC: clientId + signing key from .env]
  → qb-auth validates callbackUrl vs ClientApp.allowedCallbackUrls (static)
  → redirect user to qb-accounts/?callback=TOKEN → user logs in (IdP cookie qb.session_token on .ROOT_DOMAIN)
  → /api/auth/callback mints single-use code (Redis, 60s) → redirect to callbackUrl?code=
  → Consumer /api/auth/callback → exchangeCode(code) → set qb.session_token cookie
```

### Blockers

1. Host pinned in env → one app, many hosts, callback always points to the env host.
2. Cookie `domain` hardcoded → cannot set a cookie on a custom domain.
3. Static callback/returnTo allowlist → arbitrary domains rejected (`callback_not_allowed`).
4. One ClientApp + signing key in `.env` per app; allowlist cannot scale to N dynamic domains.
5. Cookies cannot be shared across registrable domains (`dozzze-romeo.com` vs `hostravel.net`).

## 2. Goals / Non-goals

**Goals**
- Any qb-auth user can authenticate on any registered owner custom domain, with **no per-domain `.env`/allowlist edit**.
- One **uniform** SSO integration reused by all three web consumers.
- **Per-domain sessions** (cookie scoped to each registrable domain) that nonetheless deliver a **global-SSO experience** via silent re-authentication.
- Keep qb-auth the single IdP; opaque, revocable, server-verified session tokens.

**Non-goals (now)**
- Automated DNS/Cloudflare domain verification. Verification and activation are **manual** (admin) for now.
- Self-service per-property domain UI (future, Phase 4).
- Sharing one cookie across different registrable domains (not possible; not attempted).

## 3. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Session storage in browser | **httpOnly + Secure cookie**, per registrable domain. **Never localStorage.** | localStorage is JS-readable (XSS) and is origin-scoped, so it neither crosses domains nor is safe for tokens. |
| Cross-domain propagation | **Silent re-auth via top-level redirect** to the IdP. | Storage never crosses registrable domains; the IdP redirect does. Top-level (not iframe) is robust against third-party-cookie blocking (Safari ITP, Chrome). |
| Central session | qb-auth IdP cookie (`qb.session_token` on the accounts domain) is the source of truth; short-lived handoff **codes live in Redis** (already the case). | Central revocation; reuses existing better-auth session + Redis auth-code machinery. |
| Custom-domain trust | **`TenantDomain` registry in qb-auth**, manually seeded + manually verified/activated for now. | IdP owns its own dynamic allowlist; closes the open-redirect hole the static allowlist otherwise leaves. |
| Silent re-auth trigger | **On-demand** (login click / protected route), not eager. | No redirect "flash" for anonymous visitors on public template/booking pages. |

## 4. Architecture

### 4.1 qb-auth (IdP)

- **`TenantDomain` model** (new) — the dynamic allowlist of legitimate owner domains.
- **Dynamic callback validation** — a callback host is allowed if it matches the client's static `allowedCallbackUrls` **OR** is an `active` `TenantDomain` for that `clientId`; path must be `/api/auth/callback`. Same rule for `returnTo`. Additive: existing fixed-subdomain clients keep working unchanged.
- **`prompt=none` support** — silent probe: if the IdP session cookie is present, skip the login UI and mint a code; if absent, return the user to the origin with an `sso=none` marker (no login form, no loop).
- IdP cookie remains `qb.session_token`, httpOnly + Secure, cross-subdomain on the accounts root domain (better-auth `crossSubDomainCookies`).

### 4.2 Shared web-SSO library (uniform across the 3 apps)

A single reusable module (same shape in each app, mirroring the existing copied `qb-auth` client pattern):

- `currentOrigin(req)` — derive `scheme://host` from `X-Forwarded-Host` / `X-Forwarded-Proto` (fallback `Host`). **Not from env.** This is the host-aware core.
- `loginRedirect({ returnTo, prompt })` — builds `callbackUrl = ${currentOrigin}/api/auth/callback`, calls `createCallbackToken`, redirects.
- `/api/auth/callback` handler — exchanges the code and sets the session cookie on the **registrable domain of the current host** (PSL-aware helper); no hardcoded `domain`.
- `getSession()` — verifies `qb.session_token` against qb-auth, cached ~30s (already exists per app).
- on-demand silent re-auth helper — used by login buttons / protected routes; redirects with `prompt=none` so returning users with an IdP session are logged in without a form, while anonymous users fall back gracefully.

Each app's `.env` keeps **only** the service identity: `QB_AUTH_URL`, `QB_AUTH_CLIENT_ID`, `QB_AUTH_SIGNING_KEY`. Removed: hardcoded app URL for callback/cookie, per-domain allowlist.

### 4.3 Cookie strategy

Per-domain cookie: `httpOnly` + `Secure` + `SameSite=Lax`, `domain` = the registrable domain of the current host (`.hostravel.net`, `.dozzze-romeo.com`, …). Shared across apex/subdomains of the same registrable domain; never across different registrable domains. A PSL-aware helper computes the registrable domain (handles multi-label TLDs).

### 4.4 Silent re-auth flow (on-demand)

```
First login (domain D1):
  user → app D1 (no local cookie) → loginRedirect → qb-auth (login UI) → user authenticates
  → IdP cookie set on accounts + session persisted → one-time code → D1/api/auth/callback
  → exchange → httpOnly cookie set on D1

Visiting domain D2 (global SSO, no prompt):
  user clicks login / hits protected route on D2 (no local cookie) but HAS the IdP cookie
  → loginRedirect(prompt=none) → qb-auth sees IdP cookie → mints code immediately (no form)
  → D2/api/auth/callback → exchange → httpOnly cookie set on D2 → logged in without a form

Anonymous public visitor:
  no redirect at all until they click login or enter a protected area.
```

### 4.5 Single logout (SLO)

Logout on any domain calls qb-auth `revoke-session` + `logout-fanout` (route already exists). The central session is revoked; every domain's `verifySession` fails within its ~30s cache TTL, effectively logging the user out everywhere. Local cookies are cleared on next request / via fanout.

## 5. Security

- `TenantDomain` checked on **every** callback/returnTo validation → anti open-redirect (without it, dynamic callbacks are an open redirect).
- Tokens are opaque, server-verified, and live only in `httpOnly` + `Secure` cookies — never in localStorage or JS-reachable storage.
- Handoff codes remain single-use, Redis-backed, TTL 60s.
- Silent re-auth uses **top-level redirects**, never iframes (third-party-cookie-safe).
- Rate-limit `prompt=none` probes (reuse the existing `rateLimit` helper).
- `prompt=none` reveals only "has session / no session" — no user enumeration.

## 6. Data model

```prisma
/// Owner custom domains that qb-auth trusts as SSO callback hosts.
/// Manually created + verified + activated for now (admin); the future
/// per-property UI (Phase 4) writes to this same table.
model TenantDomain {
  id         String   @id @default(cuid())
  host       String   @unique          // e.g. "dozzze-romeo.com" (host only, no scheme/path)
  clientId   String                    // the ClientApp that serves this domain (e.g. "qb-sites")
  propertyId String?                   // optional link to a property (future)
  verified   Boolean  @default(false)  // set manually by admin (DNS/ownership confirmed)
  active     Boolean  @default(false)  // set manually by admin; only active domains pass validation
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([clientId])
  @@map("tenant_domain")
}
```

Validation rule (unambiguous): a callback/returnTo host passes if it is a `TenantDomain` with **`active === true`** for the authenticated `clientId`, OR it matches the client's static `allowedCallbackUrls`/`allowedDomains`. `verified` is an admin bookkeeping flag (ownership confirmed); the admin is expected to set `verified` before flipping `active`, but the **gate is `active` alone** to keep the check simple and single-purpose.

## 7. Rollout (one spec → plan → implementation cycle per phase)

This document is the umbrella design. Each phase gets its own implementation plan.

### Phase 1 — qb-auth (foundation)
Everything else depends on it; it is the single shared piece.
- `TenantDomain` Prisma model + migration.
- Manual admin path to add domains now: admin endpoint (`POST /api/admin/tenant-domains`) and/or seed. **Verification + activation are manual** (admin sets `verified`/`active`); no automated job.
- Dynamic callback validation in `src/lib/callback-validator.ts` (additive to the static allowlist).
- `prompt=none` support in the flow entry (`src/app/api/flow/route.ts`, the `?callback=` landing) and `src/app/api/auth/callback/route.ts`.
- **Done when:** qb-auth accepts login/callback from any `active` `TenantDomain` and answers silent probes; existing clients unaffected. Validate via `tsc` + manual flow (qb-auth has lint only).

### Phase 2 — shared lib + Qb-Property-Template (hardest case first)
- Build the shared web-SSO helper (`currentOrigin`, `loginRedirect`, host-aware callback handler with PSL cookie-domain, on-demand silent re-auth).
- Fix the hardcoded bugs: `src/app/api/login/route.ts`, `src/app/api/auth/callback/route.ts` (kills `domain: '.divergtech.com'`), `src/app/api/logout/route.ts`.
- Trim `.env` to the service identity only.
- **Done when:** login works on `sites.hostravel.net/[slug]` **and** on a registered custom domain (e.g. `dozzze-romeo.com`) with a per-domain httpOnly cookie and no per-domain config. `pnpm check` passes.

### Phase 3 — qb-panel + QuickBookTravelFrontend (uniform)
- Port the same helper into both (fixed `*.hostravel.net` subdomains — the easy case); replace their login/callback/cookie code and remove hardcoded host/cookie env deps.
- **Done when:** all three apps use the identical pattern and global SSO (silent re-auth when crossing domains) works between them.

### Phase 4 — future: per-property domains (still manual verification)
- qb-panel UI lets an owner request domain(s) per property → writes `TenantDomain` with `verified=false`, `active=false`.
- **Verification + activation remain manual (admin)** for now — no DNS/Cloudflare automation yet. Uses the `propertyId` field from Phase 1. Out of scope for the current effort.

**Dependencies:** `1 → 2 → 3`; `4` builds on `1`.

## 8. Open questions

- PSL helper: adopt a small public-suffix library vs a curated list of the few TLDs in use (`hostravel.net`, `divergtech.com`, owner `.com`s). Decide in the Phase 2 plan.
- Whether qb-panel/booking should also register their fixed hosts as `TenantDomain` for consistency, or keep using the static `allowedCallbackUrls`. Default: keep static for fixed hosts; `TenantDomain` only for dynamic ones.

## 9. Out of scope
Automated domain verification, self-service domain UI, sharing a single cookie across registrable domains, and any change to how qb-back/qb-sync authenticate (service JWTs unchanged).
