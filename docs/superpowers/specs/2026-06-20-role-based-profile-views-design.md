# Role-Based Profile Views — qb-auth

**Date:** 2026-06-20
**Status:** Approved
**Scope:** qb-auth profile section + admin dashboard extension

---

## Problem

All authenticated users land on the same `/profile` page regardless of their role. A system admin, a property owner, a staff member, and a client traveler all see identical content. The platform needs distinct, role-appropriate views so each user type can manage their relevant data without noise from irrelevant sections.

Additionally, the "Buscar alojamiento" nav button falls back to `/` because `QB_BOOKING_URL` is not seeded in the `systemConfig` table.

---

## Role Model

Role detection runs server-side on each route. Priority order:

| Priority | Condition | View |
|---|---|---|
| 1 | `user.isSystemAdmin === true` | System Admin |
| 2 | has org membership AND `Owner` record exists in qb-back AND role is `owner` or `admin` | Org Full Access |
| 3 | has org membership AND `Owner` record exists in qb-back AND role is `staff` or `agent` | Org Restricted |
| 4 | everything else | Client |

**Owner record check:** qb-auth calls qb-back (`GET /users/owners?authUserId=X`) server-side using a HMAC service JWT before deciding the view. If the call fails or returns no record, the user falls to the Client view — never silently elevated.

---

## Route Architecture

```
/profile            → Client view (personal consumption)
                      If user has org + Owner record → redirect /profile/org
                      If user visited with ?view=client → skip redirect (owner seeing client view)

/profile/org        → Owner/org view (requires org + Owner record)
                      If no org or no Owner record → redirect /profile

/dashboard          → System admin view (requires isSystemAdmin)
                      Already exists, will be extended with real KPIs

/profile/config     → Settings (all roles, unchanged)
/profile/reservations → Guest reservation history (all roles, unchanged)
/profile/invoices   → Invoice history (all roles, unchanged)
```

---

## View 1: Client `/profile`

**Who sees it:** Users with no org membership, or users who have an org but explicitly requested `?view=client`.

### KPI Bar (top)
- Reservas activas (count: reservations where `checkIn >= today AND status = CONFIRMED`)
- Estancias completadas (count: status = CHECKED_OUT)
- Total gastado (sum: invoices `customerAuthUserId = me AND status = PAID`)
- Favoritos (count: from localStorage `qb:favorites:v1`)

Data source: `GET /reservations?customerId=X` and `GET /finance/invoices?customerAuthUserId=X` on qb-back.

### Cards
1. **Próximas estancias** — next 3 upcoming reservations with property name, dates, status badge
2. **Historial de reservas** — link card → `/profile/reservations`
3. **Mis facturas y contratos** — link card → `/profile/invoices`
4. **Mi perfil** — name, email, phone, address → `/profile/config`
5. **Mi suscripción** — current plan badge (ACTIVE/TRIALING/EXPIRED), billing cycle, upgrade CTA if on free plan

### Owner Upgrade CTA
If user has no org: persistent card at bottom — "¿Tienes una propiedad? Empieza a hospedar" → links to org creation flow (existing org management in qb-auth).

---

## View 2: Owner/Org `/profile/org`

**Who sees it:** Users with org membership + Owner record in qb-back.

### Header
- Org logo, org name, slug
- Sub-header: user's role badge (Propietario / Administrador / Staff / Agente)
- Button: **"Ver como cliente"** → navigates to `/profile?view=client`

### KPI Bar
- Propiedades activas (`isLive = true`, filtered by `organizationId`)
- Reservas este mes (checkIn within current month, by org)
- Ingresos este mes (sum payouts `paidAt` within month, by org) — **hidden for staff/agent**
- Rating promedio (avg `avgRating` across org properties)

Data sources:
```
GET /properties?organizationId=X                       → org property list + IDs
GET /reservations?propertyId=P1,...                    → monthly bookings (per-property, parallel)
GET /finance/payouts?ownerId=X&paidAtFrom=Y            → monthly income
```

Note: qb-back reservations API filters by `propertyId`, not `organizationId`. Implementation fetches org property IDs first, then queries reservations in parallel by property. For KPI counts, a lightweight aggregation endpoint may be preferable — tracked in implementation plan.

### Cards

**All roles (owner, admin, staff, agent):**
1. **Mis propiedades** — list of org properties with name, status (Live/Draft), avgRating, last reservation date. Each property links to qb-panel for management.
2. **Reservas recientes** — last 5 incoming reservations across all org properties: guest name, property, dates, status, total.
3. **Solicitudes pendientes** — EntityRequests with `status=PENDING` and `requestedByRole=OWNER|CUSTOMER` affecting org properties.

**Owner and org admin only (role=owner|admin):**
4. **Equipo** — count of members by role (admin/staff/agent), invite button → org member management
5. **Finanzas** — monthly income KPI expanded: payouts pending, next expected payout, link → `/profile/invoices?view=org`

### Permission Matrix (what actions are enabled)

| Action | owner | admin | staff | agent |
|---|---|---|---|---|
| Ver KPIs financieros | ✅ | ✅ | ❌ | ❌ |
| Ver equipo + invitar | ✅ | ✅ | ❌ | ❌ |
| Ver reservas entrantes | ✅ | ✅ | ✅ | ✅ |
| Ver propiedades | ✅ | ✅ | ✅ | ✅ |
| Editar estado de propiedad | ✅ | ✅ | ✅ | ❌ |
| Ver solicitudes pendientes | ✅ | ✅ | ✅ | ✅ |

Restrictions enforced at UI level only (qb-back enforces authorization separately).

---

## View 3: System Admin `/dashboard`

**Who sees it:** `user.isSystemAdmin === true`. Existing route, extended.

### KPI Bar (platform-wide)
- Propiedades activas (all orgs)
- Reservas esta semana
- Nuevos usuarios (últimos 7 días — from qb-auth User table, no qb-back call needed)
- Orgs activas (org count from qb-auth)

### Cards
1. **Organizaciones** — paginated list: org name, owner, # properties, # active reservations, created date
2. **Solicitudes pendientes** — all EntityRequests status=PENDING across platform, with approve/reject actions
3. **Usuarios** — search by email/name, view profile, toggle isSystemAdmin
4. **Planes y suscripciones** — count of subscriptions by plan and status
5. **Config del sistema** — key-value editor for `systemConfig` table (includes `QB_BOOKING_URL`, etc.)

The Config del sistema card fixes the nav bug: admin sets `QB_BOOKING_URL = https://hostravel.net` (or `.com` when ready) via UI, no DB access required.

---

## Nav Bug Fix: `QB_BOOKING_URL`

**Root cause:** `QB_BOOKING_URL` row missing from `systemConfig` table. `getSystemConfig()` returns `undefined`, fallback is `'/'`.

**Fix:** Two parts:
1. Add **System Config editor card** to `/dashboard` (admin can set any systemConfig key)
2. Add a **seed/migration** that inserts `QB_BOOKING_URL = https://hostravel.net` as default — admin can update it later when domain changes to `.com`

The seed runs once (upsert), does not overwrite existing values.

---

## Component Structure

```
src/components/profile/
  role-detector.tsx          → server component, resolves role, renders correct view
  client-view/
    index.tsx                → ClientProfileView (KPI bar + cards)
    kpi-bar.tsx
    upcoming-stays-card.tsx
    subscription-card.tsx
    owner-upgrade-cta.tsx
  org-view/
    index.tsx                → OrgProfileView (header + KPI bar + cards)
    org-header.tsx           → logo, name, "Ver como cliente" button
    kpi-bar.tsx
    properties-card.tsx
    recent-reservations-card.tsx
    pending-requests-card.tsx
    team-card.tsx            → owner/admin only
    finances-card.tsx        → owner/admin only
  admin-view/
    index.tsx                → AdminDashboardView (extends existing admin-dashboard.tsx)
    platform-kpi-bar.tsx
    orgs-card.tsx
    pending-requests-card.tsx
    users-card.tsx
    system-config-card.tsx

src/lib/
  qb-back-client.ts          → server-only, HMAC-signed fetch wrapper for qb-back calls
  role-resolver.ts           → resolveProfileRole(user) → 'client' | 'org-full' | 'org-restricted' | 'admin'
```

---

## Data Fetching

All qb-back calls are **server-side** (Server Components / Route Handlers). The `qb-back-client.ts` module signs requests using the existing HMAC service JWT pattern already used in qb-auth.

**No client-side calls to qb-back.** KPI data fetches in parallel using `Promise.all` to avoid waterfall.

**Error handling:** If qb-back is unreachable, KPI cards show a skeleton/unavailable state. The view still renders — missing analytics does not block the profile page.

---

## What Is NOT in Scope

- Editing property details (handled in qb-panel, org view links there)
- Full reservation management CRUD (existing `/profile/reservations` pages handle this)
- New org creation flow (existing org management pages handle this)
- Changing org member roles (existing org management pages handle this)
- Mobile-responsive redesign of existing non-profile pages

---

## Open Questions (resolved)

- **Where does this live?** → qb-auth (confirmed: qb-booking's `/api/profile` redirects to qb-auth `/profile`)
- **Analytics depth?** → Hybrid: KPIs on dashboard, detail on existing sub-pages
- **Owner switch to client view?** → "Ver como cliente" button → `/profile?view=client`
- **Client upgrade to owner?** → CTA card → existing org creation flow
- **Role detection for owner?** → Must have BOTH org membership (qb-auth) AND Owner record (qb-back)
- **Org admin vs owner?** → Same permissions within the org view
