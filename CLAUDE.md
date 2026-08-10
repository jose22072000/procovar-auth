# CLAUDE.md — qb-auth (Identity Hub)

The ecosystem's **Auth Center**. TypeScript + **better-auth** + **Prisma** (its own
`accounts` Postgres). Also drives the checkout / pago / cancel-reservation flows.

## Responsibilities
- Sessions (cookie `qb.session_token`), verified by other services via HMAC round-trip.
- Signs **service JWTs** (RS256) for service-to-service calls; exposes **JWKS** for local
  verification. `purpose` = destination service; `audience` = e.g. `qb-back`.
- Per-client HMAC signing keys derived from `SERVICE_AUTH_SECRET` (`deriveSigningKey(clientId, v)`).
  The qb-auth admin panel is the source of truth for these — drift → "verifySession failed".
- RBAC: resolves the `rbac` claim (org / wildcard / by-property) that qb-back org-scopes on.

## qb-back ids
qb-auth treats qb-back ids as **opaque strings** — its Prisma models store them as
`String`/`Json` (never `BigInt`/`Int`), and the checkout/cancel actions interpolate them
into qb-back URLs as strings. qb-auth's OWN ids (User/Session/Organization) are `cuid()`
strings. So the qb-back bigint→uuid change needs **no qb-auth change**.

## Post-login redirect contract (do not regress)
booking-login → back to the booking step; normal login → `/profile`; external SSO → the
origin platform.

## Build
Prisma + Next/TS. eslint `eslint.config.mjs`. Env/config is owned by Dokploy — never
add/change env vars in-repo.
