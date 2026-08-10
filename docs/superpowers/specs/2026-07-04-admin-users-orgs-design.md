# qb-auth Admin — Users & Organizations Management — Design

**Date:** 2026-07-04
**Project:** qb-auth (its own admin dashboard at `/dashboard`)
**Status:** Approved design, pending implementation plan

## Problem

qb-auth's admin dashboard (`/dashboard`, gated by `isSystemAdmin`) currently has only
**Settings** (ClientApps + one system-config key) and **Permissions** (RBAC catalog view
+ sync). There is no way for a system admin to manage the platform's **users** or
**organizations** from the UI. The mutation layer for users partly exists but is unused:
`src/app/(user)/dashboard/_actions.ts` already exports `toggleUserAdmin`,
`toggleEmailVerified`, and `adminDeleteUser` with no UI wired to them.

## Goals

1. A **shared admin sub-nav** (tabs) across all `/dashboard/*` pages and a single
   `dashboard/layout.tsx` gate — replacing the per-page `isSystemAdmin` repetition and
   hardcoded cross-links.
2. A **Users** manager (`/dashboard/users`): list/search users; toggle admin & email
   verified; delete; edit profile fields; view+revoke sessions; view (read-only)
   subscription and org memberships.
3. An **Organizations** manager (`/dashboard/organizations`): list orgs; per org, view
   members (user + RBAC roles); remove member; change a member's RBAC roles; edit org;
   delete org.

## Non-goals

- No better-auth `admin()` plugin adoption (it is NOT enabled; `isSystemAdmin` is the only
  privilege flag — no ban/global-role concept). We do not add ban/role-plugin fields.
- No password reset / email change from this panel (sensitive; out of scope).
- Org RBAC role *definitions* stay managed where they already are (qb-panel + the RBAC
  catalog). Here we only assign existing org `Role`s to members.

## Architecture

All in qb-auth. Follows the existing admin pattern: server component page does the gate +
`prisma.findMany` (serializing `Date`→ISO), passes plain objects to a `'use client'`
HeroUI component, which calls server actions from `_actions.ts` directly and then
`router.refresh()`. Auth: browser/session via the existing local `requireAdmin()` in
`_actions.ts` (throws "No autorizado" if `!isSystemAdmin`).

### Files

**Created:**
- `src/app/(user)/dashboard/layout.tsx` — one `isSystemAdmin` gate for the whole group +
  renders `<AdminSubnav/>`.
- `src/components/admin/admin-subnav.component.tsx` — tabs: Configuración
  (`/dashboard/settings`), Permisos (`/dashboard/permissions`), Usuarios
  (`/dashboard/users`), Organizaciones (`/dashboard/organizations`). Active tab from
  `usePathname()`. HeroUI, matching existing admin styling.
- `src/app/(user)/dashboard/users/page.tsx` — server: fetch users + counts.
- `src/components/admin/users-manager.component.tsx` — client: table, search, row actions,
  detail drawer (sessions/subscription/orgs).
- `src/app/(user)/dashboard/organizations/page.tsx` — server: fetch orgs + member counts.
- `src/components/admin/orgs-manager.component.tsx` — client: org list → members panel +
  member/org actions.

**Modified:**
- `src/app/(user)/dashboard/_actions.ts` — add the new server actions (below).
- `src/app/(user)/dashboard/settings/page.tsx` and `permissions/page.tsx` — drop the
  now-redundant per-page gate + hardcoded cross-links (layout gates; sub-nav navigates).
  Keep their data fetches.

### Server actions (extend `_actions.ts`, all guarded by `requireAdmin()`)

Reuse: `toggleUserAdmin`, `toggleEmailVerified`, `adminDeleteUser`.

New:
- `updateUserProfile(userId, { name?, phone?, nationality?, address?, passportId? })` —
  `prisma.user.update`. `name` required non-empty if provided.
- `listUserSessions(userId)` — returns active sessions (id, ipAddress, userAgent,
  clientId, createdAt, expiresAt, revokedAt). Read via the page or a lightweight action.
- `revokeUserSession(sessionId)` and `revokeAllUserSessions(userId)` — set
  `revokedAt = new Date()` (the `Session.revokedAt` column exists; do NOT hard-delete).
- `removeOrgMember(memberId)` — `prisma.member.delete` (cascades `MemberRole`). Guard: if
  the member is the org's last `owner`-role member, refuse with an error.
- `setOrgMemberRoles(memberId, roleIds: string[])` — reconcile `MemberRole` rows for the
  member against `roleIds` (create missing, delete removed). Validate every `roleId`
  belongs to the member's organization (`Role.organizationId` match). Default new
  `MemberRole.scopeAllProperties = true`, `propertyIds = []` (matches schema defaults).
- `updateOrganizationAdmin(orgId, { name?, slug?, logo? })` — `prisma.organization.update`.
  `slug` unique — return a friendly error on conflict (P2002).
- `deleteOrganizationAdmin(orgId)` — `prisma.organization.delete` (cascades members, roles,
  invitations). Requires an explicit confirm on the client (typed org slug).

All return `{ error?: string }` (or `{ ok, error? }`) and `revalidatePath("/dashboard")`.

### Data shapes (from Prisma)

- `User`: id, name, email, emailVerified, image, isSystemAdmin, phone, nationality,
  address, passportId, createdAt. Counts: memberships, active sessions.
- `Member`: id, userId, organizationId, role (legacy string), `memberRoles[] → role`.
- `Role` (per org): id, name, color, icon, isSystem. `MemberRole`: memberId, roleId,
  scopeAllProperties, propertyIds.
- `Organization`: id, name, slug, logo, metadata, member count.
- `Session`: id, userId, ipAddress, userAgent, clientId, createdAt, expiresAt, revokedAt.
- `Subscription`: id, status, billingCycle, currentPeriodEnd, `plan → { key, name }`.

## Users page (detail)

Table columns: avatar+name, email (+ verified chip), admin chip, #orgs, created. Search by
name/email. Row actions: edit (drawer with profile fields), toggle admin, toggle verified,
delete (confirm), open detail. Detail drawer: **Sessions** (list + "revocar" per row +
"revocar todas"), **Subscription** (plan/status/period — read-only), **Organizations**
(org name + the member's roles — read-only; links conceptually to the Orgs tab).

Existing self-protection preserved: cannot remove own admin, cannot delete self.

## Organizations page (detail)

Left: org list (search by name/slug, member count). Select an org → right panel:
**Members** table (user name/email, roles as chips). Per member: **change roles**
(multi-select of that org's `Role`s → `setOrgMemberRoles`), **remove** (`removeOrgMember`,
blocked for last owner). Org header actions: **edit** (name/slug/logo drawer →
`updateOrganizationAdmin`), **delete** (typed-slug confirm → `deleteOrganizationAdmin`).

## Error handling

- Actions return `{ error }`; client shows a HeroUI `addToast({color:'danger'})`.
- Guards: self-admin/self-delete (existing); last-owner removal; slug uniqueness (P2002);
  role must belong to the org.
- Destructive org delete requires typing the org slug to enable the button.

## Testing / verification

qb-auth has no UI test runner. Verify: `npm run build` clean, then manual — log in as an
`isSystemAdmin` user; on `/dashboard/users` edit a test user, toggle flags, view+revoke a
session; on `/dashboard/organizations` open a test org, change a member's roles, remove a
member, edit and (on a throwaway org) delete.

## Branch

Independent of the qb-panel superadmin work → **new qb-auth branch off `dev`**
(`feat/admin-users-orgs`). The existing `feat/superadmin-panel` branch (plans API + the
user's notify commits) is left untouched, pending the user's separate decision.

## Implementation phasing

1. `dashboard/layout.tsx` gate + `AdminSubnav` + refactor settings/permissions pages.
2. User server actions (updateUserProfile, session list/revoke) in `_actions.ts`.
3. Users page + `UsersManager`.
4. Org server actions (removeOrgMember, setOrgMemberRoles, updateOrganizationAdmin,
   deleteOrganizationAdmin) in `_actions.ts`.
5. Organizations page + `OrgsManager`.
