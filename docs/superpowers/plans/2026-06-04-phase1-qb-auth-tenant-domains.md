# Phase 1 — qb-auth: TenantDomain + dynamic callback validation + prompt=none — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let qb-auth accept SSO logins/callbacks from dynamically-registered owner custom domains (no static allowlist edit) and support silent re-auth (`prompt=none`), as the foundation for global multi-tenant SSO.

**Architecture:** Add a `TenantDomain` registry (admin-managed, manual verify/activate). Make `callback-validator` accept a host that is an `active` `TenantDomain` for the calling client, in addition to the existing static `allowedCallbackUrls`. Thread a `prompt=none` flag through the existing flow so a silent probe with no IdP session bounces the user back to the app (no login form) instead of looping.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 / Postgres, Better Auth, Zod, Redis (existing auth-code/flow). qb-auth has **no test runner** — validation is `npx tsc --noEmit` + manual flow checks.

**Conventions for this plan:**
- **No commits.** Claude must not `git commit`/`push`. Each task ends at a verification step; the team commits manually after review.
- Spec: `docs/superpowers/specs/2026-06-04-global-sso-multi-tenant-design.md`.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `prisma/schema.prisma` | `TenantDomain` model | Modify |
| `prisma/migrations/*` | additive migration | Create (via `prisma migrate dev`) |
| `src/lib/callback-validator.ts` | dynamic host validation | Modify |
| `src/lib/flow-state.ts` | `prompt` field on `FlowOptions` | Modify |
| `src/app/api/flow/route.ts` | carry `prompt` into flow cookie | Modify |
| `src/app/(user)/page.tsx` | silent-probe bounce when no session | Modify |
| `src/app/api/admin/tenant-domains/route.ts` | list + create domains | Create |
| `src/app/api/admin/tenant-domains/[id]/route.ts` | verify/activate/delete | Create |

---

## Task 1: `TenantDomain` model + migration

**Files:**
- Modify: `prisma/schema.prisma` (after the `ClientApp` model, ~line 197)
- Create: `prisma/migrations/<timestamp>_add_tenant_domain/migration.sql` (generated)

- [ ] **Step 1: Add the model to the schema**

In `prisma/schema.prisma`, immediately after the `ClientApp` model's closing `}` (`@@map("client_app")`), add:

```prisma
/// Owner custom domains that qb-auth trusts as SSO callback hosts.
/// Manually created + verified + activated by an admin for now; the future
/// per-property UI writes to this same table. The validation gate is `active`.
model TenantDomain {
  id         String   @id @default(cuid())
  host       String   @unique /// host only, no scheme/path, lowercase (e.g. "dozzze-romeo.com")
  clientId   String /// the ClientApp.clientId that serves this domain (e.g. "qb-sites")
  propertyId String? /// optional link to a property (future)
  verified   Boolean  @default(false) /// admin sets after confirming ownership
  active     Boolean  @default(false) /// admin sets; ONLY active domains pass validation
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([clientId])
  @@map("tenant_domain")
}
```

- [ ] **Step 2: Create + apply the migration**

Run: `npx prisma migrate dev --name add_tenant_domain`
Expected: a new migration folder is created; output ends with `Your database is now in sync with your schema.` (requires a reachable dev Postgres / `DATABASE_URL`).

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npm run generate`
Expected: `Generated Prisma Client` — `prisma.tenantDomain` now exists on the client.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i tenantdomain`
Expected: no output (no type errors referencing TenantDomain). (Pre-existing unrelated errors in the repo are out of scope.)

- [ ] **Step 5: Stop for review (no commit).** Report files changed; the team commits.

---

## Task 2: Dynamic callback/returnTo validation

**Files:**
- Modify: `src/lib/callback-validator.ts`

- [ ] **Step 1: Add the tenant-domain lookup helper**

In `src/lib/callback-validator.ts`, add this function just below the existing `matchesDomain` function:

```ts
/**
 * A host is a trusted tenant callback host when it is an `active` TenantDomain
 * registered for this client. This is the dynamic complement to the static
 * `allowedCallbackUrls` / `allowedDomains` lists.
 */
async function isActiveTenantHost(clientId: string, host: string): Promise<boolean> {
    const found = await prisma.tenantDomain.findFirst({
        where: { clientId, host: host.toLowerCase(), active: true },
        select: { id: true },
    });
    return Boolean(found);
}
```

- [ ] **Step 2: Use it for `callbackUrl`**

In `validateCallbackPayload`, replace the callback check:

```ts
    if (!matchesCallback(client.allowedCallbackUrls, cb)) {
        throw new CallbackValidationError('callback_not_allowed', `callbackUrl is not in allowlist for ${client.clientId}`);
    }
```

with:

```ts
    if (!matchesCallback(client.allowedCallbackUrls, cb)) {
        const tenantOk =
            cb.pathname === '/api/auth/callback' &&
            (await isActiveTenantHost(client.clientId, cb.host));
        if (!tenantOk) {
            throw new CallbackValidationError('callback_not_allowed', `callbackUrl is not in allowlist for ${client.clientId}`);
        }
    }
```

- [ ] **Step 3: Use it for `returnTo`**

In the same function, replace the returnTo domain check:

```ts
        if (!matchesDomain(client.allowedDomains, rt)) {
            throw new CallbackValidationError('return_to_not_allowed', `returnTo host not in allowedDomains for ${client.clientId}`);
        }
```

with:

```ts
        if (!matchesDomain(client.allowedDomains, rt) && !(await isActiveTenantHost(client.clientId, rt.host))) {
            throw new CallbackValidationError('return_to_not_allowed', `returnTo host not in allowedDomains for ${client.clientId}`);
        }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i callback-validator`
Expected: no output.

- [ ] **Step 5: Manual verification (requires dev server + a test client)**

Seed an active tenant domain for an existing client (e.g. `qb-back` or a `qb-sites` client) directly in the DB or via Task 4's endpoint, then mint a callback token for a custom-domain callbackUrl. With `qb-back`'s signing key set in env, run:

```bash
# Expect HTTP 200 + {token,...} once tenant_domain row exists & active=true.
# Expect 400 callback_not_allowed when no active row exists.
node scripts/dev-callback-token.mjs https://dozzze-romeo.com/api/auth/callback
```
(If no such script exists, verify by driving the real `/api/login` flow from Phase 2, or temporarily add a row with `active=true` and confirm the redirect to qb-accounts no longer 400s.)

- [ ] **Step 6: Stop for review (no commit).**

---

## Task 3: `prompt=none` support (silent probe)

**Files:**
- Modify: `src/lib/flow-state.ts` (the `FlowOptions` interface)
- Modify: `src/app/api/flow/route.ts`
- Modify: `src/app/(user)/page.tsx`

- [ ] **Step 1: Add `prompt` to `FlowOptions`**

In `src/lib/flow-state.ts`, inside `export interface FlowOptions { ... }`, add this line (e.g. after `action`):

```ts
  prompt?: 'none';
```

- [ ] **Step 2: Read `prompt` in the flow entry**

In `src/app/api/flow/route.ts`, inside `GET`, after `const legacyOp = sp.get('op');` add:

```ts
    const prompt = sp.get('prompt') === 'none' ? 'none' : undefined;
```

Then in the `if (callbackToken) { ... }` branch, change the `payload = { ... }` assignment to include `prompt`:

```ts
            payload = {
                clientId: decoded.clientId,
                origin: decoded.callbackUrl,
                redirectOrigin: true,
                returnTo: decoded.returnTo ?? undefined,
                prompt,
            };
```

- [ ] **Step 3: Carry `prompt` through the landing redirect**

In `src/app/(user)/page.tsx`, update the searchParams type and the `callback` redirect.

Change the type:

```ts
  searchParams: Promise<{ op?: string; callback?: string; prompt?: string }>;
```

Change the callback redirect block:

```ts
  if (callback) {
    redirect(`/api/flow?callback=${encodeURIComponent(callback)}`);
  }
```

to:

```ts
  if (callback) {
    const promptQs = params.prompt === 'none' ? '&prompt=none' : '';
    redirect(`/api/flow?callback=${encodeURIComponent(callback)}${promptQs}`);
  }
```

- [ ] **Step 4: Bounce the silent probe when there is no session**

In `src/app/(user)/page.tsx`, add `clearFlowState` to the existing import from `@/lib/flow-state`:

```ts
import { getFlowState, decodeFlowOptions, buildExternalRedirectUrl, getSessionCookieName, clearFlowState } from '@/lib/flow-state';
```

Then, **before** the `const cookieStore = await cookies(); const savedEmail = ...` line (i.e. when execution reaches the point where it would render the login form for an unauthenticated user), add:

```ts
  // Silent probe (prompt=none) with no IdP session: do NOT show a login form.
  // Bounce back to the calling app with ?sso=none so it renders as anonymous.
  if (!user) {
    const flowState = await getFlowState();
    if (flowState?.prompt === 'none' && flowState?.origin) {
      await clearFlowState();
      // redirect() must stay OUTSIDE try/catch: Next signals redirects by
      // throwing, so a try/catch around redirect() would swallow it.
      let back = flowState.origin;
      try {
        const u = new URL(flowState.origin);
        u.searchParams.set('sso', 'none');
        back = u.toString();
      } catch {
        // origin not a parseable absolute URL — fall back to it verbatim
      }
      redirect(back);
    }
  }
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "flow-state|api/flow|\(user\)/page"`
Expected: no output.

- [ ] **Step 6: Manual verification**

1. Logged OUT, visit `/?callback=<valid-token>&prompt=none` → you are redirected back to the app's callback origin with `?sso=none` (no login form shown).
2. Logged IN (IdP cookie present), same URL → you proceed to `/api/auth/callback` and get a `?code=` redirect (no form). 
3. `/?callback=<token>` WITHOUT `prompt=none`, logged out → login form shows (unchanged behavior).

- [ ] **Step 7: Stop for review (no commit).**

---

## Task 4: Admin endpoints to manage tenant domains

**Files:**
- Create: `src/app/api/admin/tenant-domains/route.ts`
- Create: `src/app/api/admin/tenant-domains/[id]/route.ts`

- [ ] **Step 1: Create the list + create route**

Create `src/app/api/admin/tenant-domains/route.ts`:

```ts
/**
 * Admin: TenantDomain management.
 *
 * GET  /api/admin/tenant-domains   → list all
 * POST /api/admin/tenant-domains   → create (verified/active default false)
 *
 * Requires a logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

const CreateSchema = z.object({
    host: z.string().min(3).regex(/^[a-z0-9.-]+$/, 'host must be a bare lowercase hostname'),
    clientId: z.string().min(2),
    propertyId: z.string().optional(),
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
});

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const domains = await prisma.tenantDomain.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ domains });
}

export async function POST(req: NextRequest) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const host = parsed.data.host.toLowerCase();
    const exists = await prisma.tenantDomain.findUnique({ where: { host } });
    if (exists) return NextResponse.json({ error: 'already_exists' }, { status: 409 });

    const created = await prisma.tenantDomain.create({ data: { ...parsed.data, host } });
    audit({ action: 'admin.tenant_domain.create', userId: guard.user.id, meta: { host, clientId: created.clientId } });
    return NextResponse.json({ domain: created }, { status: 201 });
}
```

- [ ] **Step 2: Create the verify/activate/delete route**

Create `src/app/api/admin/tenant-domains/[id]/route.ts`:

```ts
/**
 * Admin: single TenantDomain.
 *
 * PATCH  /api/admin/tenant-domains/:id   → set verified / active
 * DELETE /api/admin/tenant-domains/:id   → remove
 *
 * Requires a logged-in user with isSystemAdmin = true.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
}).refine((v) => v.verified !== undefined || v.active !== undefined, { message: 'nothing to update' });

export async function PATCH(req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.issues }, { status: 400 });

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updated = await prisma.tenantDomain.update({ where: { id }, data: parsed.data });
    audit({ action: 'admin.tenant_domain.update', userId: guard.user.id, meta: { id, ...parsed.data } });
    return NextResponse.json({ domain: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;

    const existing = await prisma.tenantDomain.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.tenantDomain.delete({ where: { id } });
    audit({ action: 'admin.tenant_domain.delete', userId: guard.user.id, meta: { id, host: existing.host } });
    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -i tenant-domains`
Expected: no output.

- [ ] **Step 4: Manual verification (logged-in system admin, dev server)**

```bash
# Create (active=false by default)
curl -s -X POST $APP_URL/api/admin/tenant-domains \
  -H 'content-type: application/json' --cookie "qb.session_token=<admin-session>" \
  -d '{"host":"dozzze-romeo.com","clientId":"qb-sites"}'
# → 201 {domain:{...,active:false}}

# Activate
curl -s -X PATCH $APP_URL/api/admin/tenant-domains/<id> \
  -H 'content-type: application/json' --cookie "qb.session_token=<admin-session>" \
  -d '{"verified":true,"active":true}'
# → 200 {domain:{...,active:true}}

# List
curl -s $APP_URL/api/admin/tenant-domains --cookie "qb.session_token=<admin-session>"
```
Expected: non-admin / no session → 401/403.

- [ ] **Step 5: Stop for review (no commit).**

---

## End-to-end acceptance (Phase 1 done when all true)

- [ ] `TenantDomain` table exists; admin can create/verify/activate/delete via the endpoints.
- [ ] A callback token for `https://<active-tenant-host>/api/auth/callback` is **accepted**; the same host while `active=false` (or absent) is **rejected** with `callback_not_allowed`.
- [ ] Existing fixed-allowlist clients (panel/booking) still work unchanged.
- [ ] `/?callback=<token>&prompt=none` while logged out → bounces back to the app with `?sso=none` (no login form); while logged in → proceeds to mint a code.
- [ ] `npx tsc --noEmit` shows no NEW errors attributable to these files.

## Notes / follow-ups for later phases

- `returnTo` tenant matching is exact-host only here; if owner sites use `www.` or other subdomains of the custom domain, extend `isActiveTenantHost` to allow subdomains of an active tenant host (decide in Phase 2).
- The consumer side (appending `&prompt=none`, host-aware `callbackUrl`, per-domain cookie) is **Phase 2** — Phase 1 only makes qb-auth ready.
- Consider seeding a dedicated `qb-sites` ClientApp (scopes `['callback:create','session:verify','auth:exchange']`) for the template app in `prisma/seed.ts`; confirm the clientId used by Qb-Property-Template before Phase 2.
