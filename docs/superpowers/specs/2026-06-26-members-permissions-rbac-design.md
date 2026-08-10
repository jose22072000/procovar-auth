# Members & Permissions (RBAC) — Design

**Date:** 2026-06-26
**Services:** qb-auth (engine), qb-panel (management UI), qb-back (enforcement)
**Status:** Approved design — ready for implementation plan

## Summary

Add organization-level Role-Based Access Control to the QB ecosystem. Users join an
organization via the existing invitation flow (email through qb-notify — untouched). The
RBAC engine lives in qb-auth: a fixed, dev-declared permission catalog; user-created custom
roles (org-scoped); role assignment to members with optional per-property scoping; and
resolved permissions baked into the Pattern B JWT that qb-auth already mints. qb-panel
provides the management UI; qb-panel + qb-back enforce permissions in this first delivery.
Other services (QBT, qb-notify, qb-sync) read claims later, incrementally.

### Decisions locked during brainstorming

1. **Scope:** roles apply at organization level, and a role *assignment* may be limited to
   specific properties. Property IDs live in qb-back; qb-auth stores them as opaque strings.
2. **Permission catalog:** fixed, declared in code, seeded into qb-auth. Users compose roles
   from existing permissions; they cannot invent capabilities.
3. **Enforcement reach (this delivery):** build the full engine + claims; enforce only in
   qb-panel + qb-back now. Remaining services consume claims later.
4. **Engine:** custom RBAC schema + JWT claims (NOT better-auth's access-control plugin —
   it is org-scoped and does not support property scoping natively).
5. **Bypass:** only `User.isSystemAdmin` is an absolute bypass. `owner` is a normal seeded
   role whose permissions are resolved from `RolePermission` and CAN be removed.
6. **Reservations are NOT a permission.** Making reservations is normal guest behavior; the
   `reservation.*` block is excluded from the catalog.
7. **Layer separation:** RBAC never gates public QBT reads or a user's own profile. A user
   with empty RBAC is still a normal client (full QBT + profile). Being staff still flips the
   `ProfileRole` (existing `role-resolver.ts`) exactly as today — RBAC only *adds* granularity
   on top of the org profile.

## 1. Data Model (qb-auth Prisma)

> Properties live in qb-back, not qb-auth. `propertyIds` are stored as opaque string
> references (Json), never FKs.

### New models

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique          // "property.edit"
  resource    String                    // "property"
  action      String                    // "edit"
  service     String                    // "qb-back" | "qb-auth" | ...
  group       String                    // UI group, e.g. "Propiedades"
  label       Json                       // { es, en }
  description  Json?
  isDeprecated Boolean  @default(false)  // soft-remove, never hard-delete
  rolePermissions RolePermission[]
  @@map("permission")
}

model Role {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  description    String?
  color          String?
  isSystem       Boolean  @default(false) // owner/admin/member: non-deletable
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  permissions    RolePermission[]
  memberRoles    MemberRole[]
  @@unique([organizationId, name])
  @@map("role")
}

model RolePermission {
  id           String     @id @default(cuid())
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@unique([roleId, permissionId])
  @@map("role_permission")
}

model MemberRole {
  id                 String   @id @default(cuid())
  memberId           String
  roleId             String
  scopeAllProperties Boolean  @default(true)
  propertyIds        Json     @default("[]")  // string[]; empty when scopeAll=true
  member             Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  role               Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@unique([memberId, roleId])
  @@map("member_role")
}
```

### Changes to existing models

- `Member.role` (String) — **kept** for back-compat (owner/admin/member) and display. Real
  authority moves to `MemberRole`. Add relation `memberRoles MemberRole[]`.
- `Organization` — add relation `roles Role[]`.
- `Invitation` — add `roleId String?`, `propertyIds Json @default("[]")`,
  `scopeAllProperties Boolean @default(true)`. On accept, these create the `MemberRole`.

### Who can edit what

| Actor | Can edit |
|---|---|
| `isSystemAdmin` | everything, incl. system roles (owner/admin/member) and owner's permissions |
| Org user with `role.*` permission | only **custom** roles in their org |
| Everyone else | no role management |

System roles (owner/admin/member) are editable only by `isSystemAdmin`.

## 2. Permission Catalog

Single source of truth: `qb-auth/src/rbac/permissions.catalog.ts` — an array of entries. A
seed script upserts them idempotently into `Permission` (runs on deploy/migration). Removing
a permission = mark `isDeprecated`, never hard-delete (don't break existing roles).

Entry shape:
```ts
{ key:'property.edit', resource:'property', action:'edit',
  service:'qb-back', group:'Propiedades',
  label:{ es:'Editar propiedades', en:'Edit properties' } }
```

### MVP catalog (~30 permissions)

```
// Propiedades (qb-back)
property.read, property.create, property.edit, property.delete
// Room types / rooms (qb-back)
roomType.read, roomType.edit, room.manage
// Media (qb-back)
media.read, media.upload, media.edit, media.delete
// Tarifas / precios (qb-back)
rate.read, rate.edit, pricing.manage
// Miembros / roles (qb-auth, managed from panel)
member.read, member.invite, member.remove, member.assignRole
role.read, role.create, role.edit, role.delete
// Finanzas / reportes (qb-back) — declared, enforcement later
finance.read, report.read
// Organización (qb-auth)
organization.edit, organization.settings
```

(No `reservation.*` — excluded by decision 6.)

### Seeded system roles (per organization)

- `owner` → all permissions
- `admin` → all except `role.delete`, `organization.settings`
- `member` → `*.read` basics only

## 3. Resolver + JWT Claims

`qb-auth/src/rbac/resolve-permissions.ts`

Input: `userId` + `activeOrganizationId` (from session). Logic:
1. `user.isSystemAdmin` → `{ wildcard: true }`. Done.
2. Find `Member` for user in that org. None → no permissions.
3. Load `MemberRole[]` → roles → `RolePermission[]`.
4. Union permissions, split by scope:
   - role with `scopeAllProperties=true` → permissions go to `global`.
   - role scoped to properties → permissions go to `byProperty[propId]`.

### Claim shape (inside existing Pattern B JWT)

```jsonc
"rbac": {
  "org": "<orgId>",
  "wildcard": false,            // true only for isSystemAdmin
  "global": ["property.read", "media.upload"],
  "byProperty": { "<propId>": ["property.edit", "rate.edit"] }
}
```

owner (normal) → `global` carries all its permissions (not wildcard).

### Shared check helper

`can(rbac, permission, propertyId?)`:
- `wildcard` → true.
- permission in `global` → true (any property).
- `propertyId` given and permission in `byProperty[propertyId]` → true.
- else false. **Deny by default.**

Same helper used by qb-panel (server actions + UI gating) and qb-back (route middleware).
`role-resolver.ts` (`ProfileRole`) is unchanged; RBAC is a separate layer on top.

## 4. qb-panel UI

Two routes under the organization, gated by `member.read` / `role.read`.

### `/dashboard/organization/[orgSlug]/members`
- Table: name, email, roles (chips), scope (all / N properties), status (active / pending invite).
- Actions per permission: **Invite** (`member.invite`), **Change roles** (`member.assignRole`),
  **Remove** (`member.remove`).
- "Invite" drawer: email + role selector + scope (all properties / pick properties). Uses the
  existing invitation flow (qb-notify sends email — untouched).
- "Edit member" drawer: add/remove roles + adjust per-role scope.

### `/dashboard/organization/[orgSlug]/roles`
- Role list: system (owner/admin/member, "Sistema" badge, read-only unless isSystemAdmin) + custom.
- Create/edit role (`role.create`/`role.edit`): name, color, permission matrix grouped by
  `group` (accordion), checkboxes, permission search.
- Delete custom role (`role.delete`) → blocked if members are assigned (warn / reassign).

### Server actions — `qb-panel/src/server/rbac.server.ts`
`listMembers`, `inviteMember`, `updateMemberRoles`, `removeMember`, `listRoles`, `createRole`,
`updateRole`, `deleteRole`, `listPermissionCatalog`. All call qb-auth over the existing HMAC
service-to-service channel.

- Dashboard "Próximamente" cards (Members/Permissions) → activated, pointing to these routes.
- Mobile: drawers, not modals (project rule).

## 5. Enforcement (qb-panel + qb-back)

### qb-auth endpoints (HMAC service-to-service)
```
GET    /rbac/permissions                      catalog
GET    /rbac/orgs/:orgId/roles                 list roles
POST   /rbac/orgs/:orgId/roles                 create
PATCH  /rbac/roles/:roleId                     edit
DELETE /rbac/roles/:roleId                     delete
GET    /rbac/orgs/:orgId/members               members + roles + scope
POST   /rbac/orgs/:orgId/members/:id/roles     assign roles
POST   /rbac/orgs/:orgId/invitations           invite (existing flow)
```
Each endpoint validates internally: system roles only `isSystemAdmin`; otherwise the caller
must hold the matching permission.

### qb-panel — double enforcement
1. **Server actions** read `rbac` from the JWT/session and call `can(...)` before acting.
   Failure → error, no execution. **This is the real barrier.**
2. **UI** hides/disables controls by `can(...)` — cosmetic only, not security.

### qb-back — middleware
- `requirePermission(perm, getPropertyId?)` helper on Express routes.
- Reads `rbac` claim from the qb-auth-minted Bearer.
- `wildcard` → pass. Property-scoped routes extract `propertyId` and check `byProperty`/`global`.
- Applied to MVP routes: property / roomType / media / rate / finance. NOT reservations.

Unified check order (`can`): wildcard → global → byProperty. Deny by default.

### Fail-safe & layer rule
- Missing `rbac` claim (stale token / drift) → treated as no permissions in panel/back, but
  QBT/profile remain intact (separate layer).
- **RBAC never gates public QBT reads.** Staff browsing QBT see properties like any guest;
  removing `property.read` only removes panel/management ability.

## 6. Invitation Flow + Migration

### Invitation (reuses existing flow; email/notify untouched)
- `inviteMember` creates `Invitation` with `roleId` + `propertyIds` + `scopeAllProperties`.
  qb-notify sends the email as today.
- On **accept**: create `Member` (if absent) + `MemberRole` from the invitation's role/scope.
  `Member.role` String set to the role name (back-compat/display).

### Migration of existing data (idempotent, once on deploy)
- Seed `Permission` catalog + system roles (owner/admin/member) per existing organization.
- Existing members (`role` "owner"/"admin"/"member") → create a `MemberRole` to the matching
  system role, `scopeAllProperties=true`.

### Back-compat
- `role-resolver.ts` and the profile claim unchanged.
- Old token without `rbac` claim → fail-safe (no panel permissions); QBT intact.

## Out of scope (this delivery)
- Enforcement in QBT, qb-notify, qb-sync (declared permissions only; wired later).
- `reservation.*` permissions.
- User-invented permissions (catalog is dev-declared).
