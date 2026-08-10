# Gap 3 — Batch user lookup endpoint

## Investigation

Searched for an existing batch-by-ids user lookup before building anything new:

- `src/app/api/rbac/orgs/[orgId]/user-search/route.ts` — type-ahead search by
  `q` (email/name substring), single-org-scoped, excludes existing members.
  Not a batch-by-id lookup and not usable outside an org context.
- `src/app/api/user/full-profile/[id]/route.ts` — the closest existing sibling:
  a single-id, backend-to-backend PII lookup (email, name, +more), gated by
  the legacy shared `BEARER_TOKEN` only (no session fallback). No batch form
  exists.
- `src/app/api/rbac/orgs/[orgId]/members/route.ts` (and sibling rbac routes)
  use a slightly different pattern: `isServiceAuth()` (same `BEARER_TOKEN`
  check) OR an authenticated session + RBAC permission check — but that
  pattern exists because those routes are org-scoped (there's a permission to
  check against). A global id→identity lookup has no org/permission concept
  of its own (the org-scoping already happened upstream, in qb-back, when it
  produced the `auth_user_id` list for `/api/properties/guests`).
- No better-auth admin plugin (`listUsers` etc.) is wired up in this codebase
  — `src/lib/auth.ts` has no `admin()` plugin registered, so there is nothing
  there to reuse either.

Conclusion: no existing batch lookup to reuse. Built a new endpoint, modeled
directly on `full-profile/[id]` (same auth mechanism, same PII-lookup shape,
same response conventions) rather than the RBAC-gate pattern, since there is
no per-request permission to check — the endpoint is a pure id→identity
translator for already-authorized machine callers.

## What was built

**`POST /api/users/lookup`** — `src/app/api/users/lookup/route.ts`

- Request: `{ "ids": string[] }`
- Response: `[{ "id": string, "email": string, "name": string }, ...]` — a bare
  JSON array (mirrors the task spec), unknown ids silently omitted, order not
  guaranteed.
- Validation: `ids` must be an array of strings (400 otherwise); blank
  entries are trimmed/dropped and the list is de-duplicated; empty result
  after cleanup returns `[]` (200) rather than erroring; more than 200 ids
  after de-dup returns 400 (`Too many ids (max 200)`).
- Data: `prisma.user.findMany({ where: { id: { in: ids } }, select: { id,
  email, name } })` — same Prisma `User` model used by every other user
  lookup in the codebase.
- Swagger/OpenAPI JSDoc block added (tag `User`) so it shows up in
  `/api/docs`, matching `full-profile/[id]`'s documentation style.

## Auth mechanism (verbatim, for the panel caller)

Same legacy shared-secret Bearer check used by `full-profile/[id]` and by
qb-panel's existing `rbac.server.ts` `svc()` helper when it calls qb-auth
directly (as opposed to `qb-back.ts`'s `mintBackendBearer()`, which is a
different, qb-back-facing JWT):

```
Authorization: Bearer <BEARER_TOKEN>
```

`BEARER_TOKEN` is the existing shared secret (env var already present in both
qb-auth and qb-panel's Dokploy config — not added, not renamed). No RS256
Platform JWT / HMAC signature path was added for this endpoint since the
existing simplest-PII-lookup sibling (`full-profile/[id]`) already uses this
exact mechanism and every panel→qb-auth server action in
`qb-panel/src/server/rbac.server.ts` already sends this exact header via its
`svc()` helper. A 401 is returned if the header is missing or the token
doesn't match.

## Build/lint

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint src/app/api/users/lookup/route.ts` — clean, no warnings.
- `npm run build` (full Next build) — succeeded (exit 0); `/api/users/lookup`
  appears in the route manifest alongside the other API routes.
- No live DB touched — build/typecheck only, no queries executed against any
  database (local or remote).

## Manual curl (local only, not run — no local qb-auth dev server was booted
for this task; describing the shape for whoever verifies end-to-end against
the local qb-auth-postgres:5433 container)

```bash
curl -sS -X POST http://localhost:3500/api/users/lookup \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":["<some-local-user-cuid>","unknown-id-noop"]}'
# -> [{"id":"<some-local-user-cuid>","email":"...","name":"..."}]
# (the unknown id is silently omitted, per spec)
```
