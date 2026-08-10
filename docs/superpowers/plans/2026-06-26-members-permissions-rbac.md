# Members & Permissions (RBAC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Org-level RBAC across the QB ecosystem — invitation-based membership, dev-declared permission catalog, user-created custom roles with optional per-property scope, resolved permissions baked into the qb-auth JWT, enforced first in qb-panel + qb-back.

**Architecture:** Engine + storage live in qb-auth (new Prisma models + a fixed permission catalog seeded by code + a resolver). qb-auth's `verify-session` returns the resolved `rbac` structure for the active org. qb-panel manages everything (Members + Roles UIs) and forwards `rbac` into the Pattern B JWT it mints for qb-back. qb-back enforces via a `requirePermission` middleware reading the `rbac` claim. A shared `can()` helper (same signature in all three repos) is the single decision function.

**Tech Stack:** qb-auth — Next.js 16 API routes, Prisma 7 (`@prisma/client`, client at `src/generated/prisma`), better-auth 1.4.6 (`organization()` plugin, untouched), vitest. qb-back — Express + Prisma, vitest. qb-panel — Next.js 16 App Router, HeroUI, next-intl, server actions (`*.server.ts`).

## Global Constraints

- **Bypass:** only `User.isSystemAdmin` is an absolute bypass (`rbac.wildcard = true`). `owner` is a normal seeded role resolved from `RolePermission`; its permissions can be removed (only by `isSystemAdmin`).
- **System roles:** `owner`, `admin`, `staff`, `agent` (these are the role strings already used across the codebase — keep them). `agent` is the default invite role.
- **System roles are editable only by `isSystemAdmin`.** Custom roles editable by org users holding the matching `role.*` permission.
- **Catalog is dev-declared** in `qb-auth/src/rbac/permissions.catalog.ts`. Removing a permission = set `isDeprecated: true`, never hard-delete.
- **No `reservation.*` permissions** — making reservations is guest behavior, out of RBAC.
- **RBAC never gates public QBT reads or a user's own profile.** Empty `rbac` ⇒ still a normal client (full QBT + profile). Being staff still flips `ProfileRole` via the existing `role-resolver.ts` — unchanged.
- **Property IDs are opaque strings** in qb-auth (`propertyIds: Json`, default `"[]"`). Properties live in qb-back; never FK them.
- **Invitation email/qb-notify path is untouched.** Extend the existing routes; do not rewrite `notifyOrganizationInvitation`.
- **Fail-safe:** missing `rbac` claim (stale token/drift) ⇒ no panel/back permissions, but QBT/profile intact.
- **Tests:** TDD in qb-auth (`npx vitest run <file>`) and qb-back (`npx vitest run <file>`). No tests in qb-panel (UI) — verify by typecheck/build.
- **Claim shape** (inside the existing Pattern B JWT, key `rbac`):
  ```jsonc
  { "org": "<orgId>", "wildcard": false,
    "global": ["property.read", "..."],
    "byProperty": { "<propId>": ["property.edit", "..."] } }
  ```

---

## File Structure

**qb-auth (engine + API):**
- `prisma/schema.prisma` — add `Permission`, `Role`, `RolePermission`, `MemberRole`; extend `Invitation`, `Member`, `Organization`.
- `src/rbac/types.ts` — shared TS types (`PermissionEntry`, `ResolvedRbac`, `PermissionKey`).
- `src/rbac/permissions.catalog.ts` — the fixed catalog array.
- `src/rbac/can.ts` — `can(rbac, perm, propertyId?)`.
- `src/rbac/resolve-permissions.ts` — `resolveRbac(userId, orgId)`.
- `src/rbac/system-roles.ts` — system-role → permission-key map + helpers.
- `scripts/seed-rbac.ts` — idempotent seed (permissions + per-org system roles + migrate existing members).
- `src/app/api/rbac/permissions/route.ts` — catalog.
- `src/app/api/rbac/orgs/[orgId]/roles/route.ts` — list/create roles.
- `src/app/api/rbac/roles/[roleId]/route.ts` — edit/delete role.
- `src/app/api/rbac/orgs/[orgId]/members/route.ts` — members + roles + scope.
- `src/app/api/rbac/orgs/[orgId]/members/[memberId]/roles/route.ts` — assign roles + scope.
- `src/app/api/organizations/[orgId]/invitations/route.ts` — extend POST with `roleId`/scope (existing file).
- `src/app/api/invitations/accept/route.ts` — on accept, create `MemberRole` (existing file).
- `src/app/api/verify-session/route.ts` — add `rbac` for active org (existing file).
- Tests under `src/rbac/__tests__/`.

**qb-back (enforcement):**
- `src/rbac/can.ts` — copy of `can()` (same signature).
- `src/middleware/require-permission.ts` — `requirePermission(perm, getPropertyId?)`.
- `src/middleware/auth.ts` — expose `req.auth.rbac` on both auth paths (existing file).
- Apply `requirePermission` in `src/modules/{properties,media,...}/routes.ts`.
- Tests under `src/rbac/__tests__/` and `src/middleware/__tests__/`.

**qb-panel (management UI):**
- `src/lib/rbac/can.ts` — copy of `can()`.
- `src/lib/session.ts` — add `rbac` to `UserSession` (existing file).
- `src/lib/qb-back.ts` — embed `claims.rbac` when minting (existing file).
- `src/server/rbac.server.ts` — server actions.
- `src/app/(dashboard)/dashboard/organization/[orgSlug]/roles/page.tsx` + components.
- `src/app/(dashboard)/dashboard/organization/[orgSlug]/members/page.tsx` + components.
- `src/components/rbac/*` — role editor, member table, drawers.
- i18n keys in the panel's messages files.

---

## PHASE 1 — qb-auth engine (schema, catalog, resolver, can)

### Task 1: Prisma schema + migration

**Files:**
- Modify: `qb-auth/prisma/schema.prisma`

**Interfaces:**
- Produces: models `Permission`, `Role`, `RolePermission`, `MemberRole`; new `Invitation` columns `roleId`, `propertyIds`, `scopeAllProperties`; relations `Member.memberRoles`, `Organization.roles`.

- [ ] **Step 1: Add models + relations to `schema.prisma`**

Append the new models and add relations to existing models:

```prisma
model Permission {
  id           String   @id @default(cuid())
  key          String   @unique
  resource     String
  action       String
  service      String
  group        String
  label        Json
  description   Json?
  isDeprecated Boolean  @default(false)
  rolePermissions RolePermission[]
  @@map("permission")
}

model Role {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  description    String?
  color          String?
  isSystem       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
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
  propertyIds        Json     @default("[]")
  member             Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  role               Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@unique([memberId, roleId])
  @@map("member_role")
}
```

In the existing `Member` model add: `memberRoles MemberRole[]`.
In the existing `Organization` model add: `roles Role[]`.
In the existing `Invitation` model add:
```prisma
  roleId             String?
  propertyIds        Json     @default("[]")
  scopeAllProperties Boolean  @default(true)
```

- [ ] **Step 2: Create migration + regenerate client**

Run: `cd qb-auth && npx prisma migrate dev --name rbac_members_permissions`
Expected: migration created under `prisma/migrations/`, client regenerated at `src/generated/prisma`, exit 0.

- [ ] **Step 3: Verify generated types exist**

Run: `cd qb-auth && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no errors referencing `Permission`/`Role`/`MemberRole`.

- [ ] **Step 4: Commit**

```bash
cd qb-auth && git add prisma/ src/generated/ && git commit -m "feat(rbac): add Permission/Role/RolePermission/MemberRole schema + invitation scope cols"
```

---

### Task 2: Permission catalog + shared types

**Files:**
- Create: `qb-auth/src/rbac/types.ts`
- Create: `qb-auth/src/rbac/permissions.catalog.ts`
- Test: `qb-auth/src/rbac/__tests__/permissions.catalog.test.ts`

**Interfaces:**
- Produces:
  - `type PermissionKey = string`
  - `interface PermissionEntry { key: string; resource: string; action: string; service: string; group: string; label: { es: string; en: string }; description?: { es: string; en: string }; isDeprecated?: boolean }`
  - `interface ResolvedRbac { org: string | null; wildcard: boolean; global: string[]; byProperty: Record<string, string[]> }`
  - `const PERMISSION_CATALOG: PermissionEntry[]`

- [ ] **Step 1: Write `types.ts`**

```ts
export type PermissionKey = string

export interface PermissionEntry {
  key: PermissionKey
  resource: string
  action: string
  service: string
  group: string
  label: { es: string; en: string }
  description?: { es: string; en: string }
  isDeprecated?: boolean
}

export interface ResolvedRbac {
  org: string | null
  wildcard: boolean
  global: PermissionKey[]
  byProperty: Record<string, PermissionKey[]>
}
```

- [ ] **Step 2: Write the failing catalog test**

`src/rbac/__tests__/permissions.catalog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { PERMISSION_CATALOG } from '../permissions.catalog'

describe('PERMISSION_CATALOG', () => {
  it('has unique keys', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('excludes reservation.* permissions', () => {
    expect(PERMISSION_CATALOG.some((p) => p.key.startsWith('reservation.'))).toBe(false)
  })
  it('includes core management permissions', () => {
    const keys = PERMISSION_CATALOG.map((p) => p.key)
    for (const k of ['property.edit', 'media.upload', 'role.create', 'member.invite']) {
      expect(keys).toContain(k)
    }
  })
  it('every entry has es+en labels and a group', () => {
    for (const p of PERMISSION_CATALOG) {
      expect(p.label.es).toBeTruthy()
      expect(p.label.en).toBeTruthy()
      expect(p.group).toBeTruthy()
    }
  })
})
```

- [ ] **Step 3: Run test → fails (module missing)**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/permissions.catalog.test.ts`
Expected: FAIL — cannot find `../permissions.catalog`.

- [ ] **Step 4: Write `permissions.catalog.ts`**

```ts
import type { PermissionEntry } from './types'

const e = (
  key: string, group: string, service: string, es: string, en: string,
): PermissionEntry => {
  const [resource, action] = key.split('.')
  return { key, resource, action, service, group, label: { es, en } }
}

export const PERMISSION_CATALOG: PermissionEntry[] = [
  // Propiedades (qb-back)
  e('property.read',   'Propiedades', 'qb-back', 'Ver propiedades', 'View properties'),
  e('property.create', 'Propiedades', 'qb-back', 'Crear propiedades', 'Create properties'),
  e('property.edit',   'Propiedades', 'qb-back', 'Editar propiedades', 'Edit properties'),
  e('property.delete', 'Propiedades', 'qb-back', 'Eliminar propiedades', 'Delete properties'),
  // Room types / rooms (qb-back)
  e('roomType.read', 'Tipos de habitación', 'qb-back', 'Ver tipos de habitación', 'View room types'),
  e('roomType.edit', 'Tipos de habitación', 'qb-back', 'Editar tipos de habitación', 'Edit room types'),
  e('room.manage',   'Tipos de habitación', 'qb-back', 'Gestionar habitaciones', 'Manage rooms'),
  // Media (qb-back)
  e('media.read',   'Media', 'qb-back', 'Ver media', 'View media'),
  e('media.upload', 'Media', 'qb-back', 'Subir media', 'Upload media'),
  e('media.edit',   'Media', 'qb-back', 'Editar media', 'Edit media'),
  e('media.delete', 'Media', 'qb-back', 'Eliminar media', 'Delete media'),
  // Tarifas / precios (qb-back)
  e('rate.read',       'Tarifas', 'qb-back', 'Ver tarifas', 'View rates'),
  e('rate.edit',       'Tarifas', 'qb-back', 'Editar tarifas', 'Edit rates'),
  e('pricing.manage',  'Tarifas', 'qb-back', 'Gestionar precios', 'Manage pricing'),
  // Miembros / roles (qb-auth)
  e('member.read',       'Miembros', 'qb-auth', 'Ver miembros', 'View members'),
  e('member.invite',     'Miembros', 'qb-auth', 'Invitar miembros', 'Invite members'),
  e('member.remove',     'Miembros', 'qb-auth', 'Quitar miembros', 'Remove members'),
  e('member.assignRole', 'Miembros', 'qb-auth', 'Asignar roles', 'Assign roles'),
  e('role.read',   'Roles', 'qb-auth', 'Ver roles', 'View roles'),
  e('role.create', 'Roles', 'qb-auth', 'Crear roles', 'Create roles'),
  e('role.edit',   'Roles', 'qb-auth', 'Editar roles', 'Edit roles'),
  e('role.delete', 'Roles', 'qb-auth', 'Eliminar roles', 'Delete roles'),
  // Finanzas / reportes (qb-back) — declarado, enforcement luego
  e('finance.read', 'Finanzas', 'qb-back', 'Ver finanzas', 'View finance'),
  e('report.read',  'Finanzas', 'qb-back', 'Ver reportes', 'View reports'),
  // Organización (qb-auth)
  e('organization.edit',     'Organización', 'qb-auth', 'Editar organización', 'Edit organization'),
  e('organization.settings', 'Organización', 'qb-auth', 'Configuración de organización', 'Organization settings'),
]
```

- [ ] **Step 5: Run test → passes**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/permissions.catalog.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd qb-auth && git add src/rbac/types.ts src/rbac/permissions.catalog.ts src/rbac/__tests__/permissions.catalog.test.ts && git commit -m "feat(rbac): permission catalog + shared types"
```

---

### Task 3: `can()` decision helper (qb-auth)

**Files:**
- Create: `qb-auth/src/rbac/can.ts`
- Test: `qb-auth/src/rbac/__tests__/can.test.ts`

**Interfaces:**
- Produces: `function can(rbac: ResolvedRbac | null | undefined, permission: string, propertyId?: string): boolean`

- [ ] **Step 1: Write failing test**

`src/rbac/__tests__/can.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { can } from '../can'
import type { ResolvedRbac } from '../types'

const base: ResolvedRbac = {
  org: 'o1', wildcard: false,
  global: ['property.read'],
  byProperty: { p1: ['property.edit'] },
}

describe('can', () => {
  it('denies when rbac missing', () => {
    expect(can(null, 'property.read')).toBe(false)
    expect(can(undefined, 'property.read')).toBe(false)
  })
  it('wildcard allows everything', () => {
    expect(can({ ...base, wildcard: true }, 'anything.at.all', 'pX')).toBe(true)
  })
  it('global permission applies to any property', () => {
    expect(can(base, 'property.read')).toBe(true)
    expect(can(base, 'property.read', 'p1')).toBe(true)
    expect(can(base, 'property.read', 'pZ')).toBe(true)
  })
  it('byProperty permission only for that property', () => {
    expect(can(base, 'property.edit', 'p1')).toBe(true)
    expect(can(base, 'property.edit', 'p2')).toBe(false)
  })
  it('byProperty permission without propertyId is denied', () => {
    expect(can(base, 'property.edit')).toBe(false)
  })
  it('unknown permission denied', () => {
    expect(can(base, 'role.delete')).toBe(false)
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/can.test.ts`
Expected: FAIL — cannot find `../can`.

- [ ] **Step 3: Write `can.ts`**

```ts
import type { ResolvedRbac } from './types'

/**
 * Single RBAC decision function. Order: wildcard → global → byProperty.
 * Deny by default. Same signature is mirrored in qb-back and qb-panel.
 */
export function can(
  rbac: ResolvedRbac | null | undefined,
  permission: string,
  propertyId?: string,
): boolean {
  if (!rbac) return false
  if (rbac.wildcard) return true
  if (rbac.global.includes(permission)) return true
  if (propertyId && rbac.byProperty[propertyId]?.includes(permission)) return true
  return false
}
```

- [ ] **Step 4: Run → passes**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/can.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd qb-auth && git add src/rbac/can.ts src/rbac/__tests__/can.test.ts && git commit -m "feat(rbac): can() decision helper"
```

---

### Task 4: System-role permission map

**Files:**
- Create: `qb-auth/src/rbac/system-roles.ts`
- Test: `qb-auth/src/rbac/__tests__/system-roles.test.ts`

**Interfaces:**
- Produces:
  - `const SYSTEM_ROLE_NAMES: readonly ['owner','admin','staff','agent']`
  - `function systemRolePermissionKeys(role: string): string[]` — concrete keys from the catalog for that system role (`owner` ⇒ all non-deprecated keys).

- [ ] **Step 1: Write failing test**

`src/rbac/__tests__/system-roles.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys } from '../system-roles'
import { PERMISSION_CATALOG } from '../permissions.catalog'

describe('system roles', () => {
  it('lists the four system roles', () => {
    expect([...SYSTEM_ROLE_NAMES]).toEqual(['owner', 'admin', 'staff', 'agent'])
  })
  it('owner gets every catalog permission', () => {
    expect(systemRolePermissionKeys('owner').sort())
      .toEqual(PERMISSION_CATALOG.map((p) => p.key).sort())
  })
  it('admin lacks role.delete and organization.settings', () => {
    const admin = systemRolePermissionKeys('admin')
    expect(admin).not.toContain('role.delete')
    expect(admin).not.toContain('organization.settings')
    expect(admin).toContain('member.invite')
  })
  it('agent is read-only basics', () => {
    expect(systemRolePermissionKeys('agent').sort())
      .toEqual(['media.read', 'property.read', 'rate.read', 'roomType.read'].sort())
  })
  it('staff is operational, no member/role management beyond read', () => {
    const staff = systemRolePermissionKeys('staff')
    expect(staff).toContain('media.upload')
    expect(staff).toContain('room.manage')
    expect(staff).not.toContain('member.invite')
    expect(staff).not.toContain('role.create')
  })
  it('unknown role returns empty', () => {
    expect(systemRolePermissionKeys('nope')).toEqual([])
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/system-roles.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `system-roles.ts`**

```ts
import { PERMISSION_CATALOG } from './permissions.catalog'

export const SYSTEM_ROLE_NAMES = ['owner', 'admin', 'staff', 'agent'] as const
export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number]

const allKeys = () => PERMISSION_CATALOG.filter((p) => !p.isDeprecated).map((p) => p.key)

const AGENT_KEYS = ['property.read', 'roomType.read', 'media.read', 'rate.read']

const STAFF_KEYS = [
  ...AGENT_KEYS,
  'roomType.edit', 'room.manage',
  'media.upload', 'media.edit',
  'rate.edit', 'pricing.manage',
  'member.read',
]

const ADMIN_EXCLUDED = new Set(['role.delete', 'organization.settings'])

export function systemRolePermissionKeys(role: string): string[] {
  switch (role) {
    case 'owner': return allKeys()
    case 'admin': return allKeys().filter((k) => !ADMIN_EXCLUDED.has(k))
    case 'staff': return [...new Set(STAFF_KEYS)]
    case 'agent': return [...AGENT_KEYS]
    default: return []
  }
}
```

- [ ] **Step 4: Run → passes**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/system-roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd qb-auth && git add src/rbac/system-roles.ts src/rbac/__tests__/system-roles.test.ts && git commit -m "feat(rbac): system-role permission map (owner/admin/staff/agent)"
```

---

### Task 5: Resolver `resolveRbac(userId, orgId)`

**Files:**
- Create: `qb-auth/src/rbac/resolve-permissions.ts`
- Test: `qb-auth/src/rbac/__tests__/resolve-permissions.test.ts`

**Interfaces:**
- Consumes: Prisma client (`@/lib/prisma`), `ResolvedRbac` type.
- Produces: `async function resolveRbac(userId: string, orgId: string | null): Promise<ResolvedRbac>`.
  - `isSystemAdmin` user ⇒ `{ org, wildcard:true, global:[], byProperty:{} }`.
  - no org or not a member ⇒ `{ org, wildcard:false, global:[], byProperty:{} }`.
  - otherwise union of `MemberRole` → `Role` → `RolePermission`, split by `scopeAllProperties`.

- [ ] **Step 1: Write failing test (mock prisma)**

`src/rbac/__tests__/resolve-permissions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prisma = {
  user: { findUnique: vi.fn() },
  member: { findUnique: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma }))

import { resolveRbac } from '../resolve-permissions'

beforeEach(() => {
  prisma.user.findUnique.mockReset()
  prisma.member.findUnique.mockReset()
})

describe('resolveRbac', () => {
  it('system admin → wildcard', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: true })
    const r = await resolveRbac('u1', 'o1')
    expect(r.wildcard).toBe(true)
  })

  it('no org → empty', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false })
    const r = await resolveRbac('u1', null)
    expect(r).toEqual({ org: null, wildcard: false, global: [], byProperty: {} })
  })

  it('not a member → empty', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false })
    prisma.member.findUnique.mockResolvedValue(null)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global).toEqual([])
  })

  it('unions roles and splits by scope', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false })
    prisma.member.findUnique.mockResolvedValue({
      id: 'm1',
      memberRoles: [
        { scopeAllProperties: true, propertyIds: [],
          role: { permissions: [
            { permission: { key: 'property.read' } },
            { permission: { key: 'media.read' } },
          ] } },
        { scopeAllProperties: false, propertyIds: ['p1', 'p2'],
          role: { permissions: [
            { permission: { key: 'property.edit' } },
          ] } },
      ],
    })
    const r = await resolveRbac('u1', 'o1')
    expect(r.global.sort()).toEqual(['media.read', 'property.read'])
    expect(r.byProperty).toEqual({ p1: ['property.edit'], p2: ['property.edit'] })
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/resolve-permissions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `resolve-permissions.ts`**

```ts
import { prisma } from '@/lib/prisma'
import type { ResolvedRbac } from './types'

const empty = (org: string | null, wildcard = false): ResolvedRbac => ({
  org, wildcard, global: [], byProperty: {},
})

export async function resolveRbac(userId: string, orgId: string | null): Promise<ResolvedRbac> {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { id: true, isSystemAdmin: true },
  })
  if (user?.isSystemAdmin) return empty(orgId, true)
  if (!orgId) return empty(null)

  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    include: {
      memberRoles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  })
  if (!member) return empty(orgId)

  const globalSet = new Set<string>()
  const byProperty: Record<string, Set<string>> = {}

  for (const mr of member.memberRoles) {
    const keys = mr.role.permissions.map((rp) => rp.permission.key)
    if (mr.scopeAllProperties) {
      for (const k of keys) globalSet.add(k)
    } else {
      const propertyIds = Array.isArray(mr.propertyIds) ? (mr.propertyIds as string[]) : []
      for (const pid of propertyIds) {
        byProperty[pid] ??= new Set<string>()
        for (const k of keys) byProperty[pid].add(k)
      }
    }
  }

  return {
    org: orgId,
    wildcard: false,
    global: [...globalSet],
    byProperty: Object.fromEntries(Object.entries(byProperty).map(([k, v]) => [k, [...v]])),
  }
}
```

- [ ] **Step 4: Run → passes**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/resolve-permissions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd qb-auth && git add src/rbac/resolve-permissions.ts src/rbac/__tests__/resolve-permissions.test.ts && git commit -m "feat(rbac): resolveRbac resolver"
```

---

### Task 6: Seed script (catalog + per-org system roles + migrate members)

**Files:**
- Create: `qb-auth/scripts/seed-rbac.ts`
- Create: `qb-auth/src/rbac/seed-core.ts` (pure, testable helpers)
- Test: `qb-auth/src/rbac/__tests__/seed-core.test.ts`

**Interfaces:**
- Consumes: `PERMISSION_CATALOG`, `SYSTEM_ROLE_NAMES`, `systemRolePermissionKeys`.
- Produces:
  - `function diffSeedPermissions(existingKeys: string[]): PermissionEntry[]` — entries to upsert.
  - `function legacyRoleToSystemRole(role: string): string` — maps existing `Member.role` strings to a system role name (`owner|admin|staff|agent`, default `agent`).

- [ ] **Step 1: Write failing test**

`src/rbac/__tests__/seed-core.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { legacyRoleToSystemRole } from '../seed-core'

describe('legacyRoleToSystemRole', () => {
  it('maps known roles to themselves', () => {
    expect(legacyRoleToSystemRole('owner')).toBe('owner')
    expect(legacyRoleToSystemRole('admin')).toBe('admin')
    expect(legacyRoleToSystemRole('staff')).toBe('staff')
    expect(legacyRoleToSystemRole('agent')).toBe('agent')
  })
  it('maps better-auth "member" to agent', () => {
    expect(legacyRoleToSystemRole('member')).toBe('agent')
  })
  it('unknown → agent', () => {
    expect(legacyRoleToSystemRole('whatever')).toBe('agent')
  })
})
```

- [ ] **Step 2: Run → fails**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/seed-core.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `seed-core.ts`**

```ts
import { PERMISSION_CATALOG } from './permissions.catalog'
import type { PermissionEntry } from './types'
import { SYSTEM_ROLE_NAMES } from './system-roles'

export function diffSeedPermissions(existingKeys: string[]): PermissionEntry[] {
  const have = new Set(existingKeys)
  return PERMISSION_CATALOG.filter((p) => !have.has(p.key))
}

export function legacyRoleToSystemRole(role: string): string {
  const known = new Set<string>(SYSTEM_ROLE_NAMES)
  if (known.has(role)) return role
  return 'agent' // better-auth "member" and anything unknown
}
```

- [ ] **Step 4: Run → passes**

Run: `cd qb-auth && npx vitest run src/rbac/__tests__/seed-core.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `scripts/seed-rbac.ts` (idempotent)**

```ts
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { PERMISSION_CATALOG } from '../src/rbac/permissions.catalog'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys } from '../src/rbac/system-roles'
import { legacyRoleToSystemRole } from '../src/rbac/seed-core'

async function main() {
  // 1. Upsert permission catalog.
  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { resource: p.resource, action: p.action, service: p.service,
        group: p.group, label: p.label, description: p.description ?? undefined,
        isDeprecated: p.isDeprecated ?? false },
      create: { key: p.key, resource: p.resource, action: p.action, service: p.service,
        group: p.group, label: p.label, description: p.description ?? undefined,
        isDeprecated: p.isDeprecated ?? false },
    })
  }
  const permByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p.id]),
  )

  // 2. Seed system roles per org + their permissions.
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  for (const org of orgs) {
    for (const name of SYSTEM_ROLE_NAMES) {
      const role = await prisma.role.upsert({
        where: { organizationId_name: { organizationId: org.id, name } },
        update: { isSystem: true },
        create: { organizationId: org.id, name, isSystem: true },
      })
      const wantKeys = systemRolePermissionKeys(name)
      const existing = await prisma.rolePermission.findMany({
        where: { roleId: role.id }, select: { permissionId: true },
      })
      const have = new Set(existing.map((e) => e.permissionId))
      const wantIds = wantKeys.map((k) => permByKey.get(k)).filter(Boolean) as string[]
      const toAdd = wantIds.filter((id) => !have.has(id))
      if (toAdd.length) {
        await prisma.rolePermission.createMany({
          data: toAdd.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        })
      }
    }
  }

  // 3. Backfill MemberRole for existing members lacking one.
  const members = await prisma.member.findMany({
    include: { memberRoles: { select: { id: true } } },
  })
  for (const m of members) {
    if (m.memberRoles.length > 0) continue
    const sysName = legacyRoleToSystemRole(m.role)
    const role = await prisma.role.findUnique({
      where: { organizationId_name: { organizationId: m.organizationId, name: sysName } },
    })
    if (!role) continue
    await prisma.memberRole.create({
      data: { memberId: m.id, roleId: role.id, scopeAllProperties: true, propertyIds: [] },
    })
  }

  console.log(`Seeded ${PERMISSION_CATALOG.length} permissions, ${orgs.length} orgs, ${members.length} members checked.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 6: Add npm script + run seed**

In `qb-auth/package.json` scripts add: `"seed:rbac": "tsx scripts/seed-rbac.ts"`.
Run: `cd qb-auth && npm run seed:rbac`
Expected: prints the seeded summary, exit 0. Re-run once more → same output, no duplicate-key errors (idempotent).

- [ ] **Step 7: Commit**

```bash
cd qb-auth && git add src/rbac/seed-core.ts src/rbac/__tests__/seed-core.test.ts scripts/seed-rbac.ts package.json && git commit -m "feat(rbac): seed script (catalog + per-org system roles + member backfill)"
```

---

## PHASE 2 — qb-auth API endpoints

> All endpoints follow the existing pattern in `src/app/api/organizations/[orgId]/members/route.ts`: resolve session via `auth.api.getSession`, OR accept service auth (legacy `BEARER_TOKEN`) used by qb-panel server actions. Reuse the `getMembership` + `isServiceAuth` helpers (copy the small `isServiceAuth` from the invitations route). Permission checks use `resolveRbac` + `can`.

### Task 7: Catalog + roles list/create endpoints

**Files:**
- Create: `qb-auth/src/app/api/rbac/permissions/route.ts`
- Create: `qb-auth/src/app/api/rbac/orgs/[orgId]/roles/route.ts`

**Interfaces:**
- `GET /api/rbac/permissions` → `{ permissions: PermissionEntry[] }` (non-deprecated catalog rows from DB).
- `GET /api/rbac/orgs/:orgId/roles` → `{ roles: { id,name,description,color,isSystem, permissionKeys:string[], memberCount:number }[] }`. Requires `role.read`.
- `POST /api/rbac/orgs/:orgId/roles` body `{ name, description?, color?, permissionKeys:string[] }` → creates custom role (`isSystem:false`). Requires `role.create`.

- [ ] **Step 1: Write `permissions/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const permissions = await prisma.permission.findMany({
    where: { isDeprecated: false },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  })
  return NextResponse.json({ permissions })
}
```

- [ ] **Step 2: Write `orgs/[orgId]/roles/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'

type Params = { params: Promise<{ orgId: string }> }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]
  const expected = process.env.BEARER_TOKEN || ''
  return !!token && !!expected && token === expected
}

async function gate(request: Request, orgId: string, perm: string) {
  if (isServiceAuth(request)) return { ok: true as const, userId: null }
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const rbac = await resolveRbac(session.user.id, orgId)
  if (!can(rbac, perm)) return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const, userId: session.user.id }
}

export async function GET(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'role.read')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const roles = await prisma.role.findMany({
    where: { organizationId: orgId },
    include: {
      permissions: { include: { permission: { select: { key: true } } } },
      _count: { select: { memberRoles: true } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id, name: r.name, description: r.description, color: r.color,
      isSystem: r.isSystem,
      permissionKeys: r.permissions.map((p) => p.permission.key),
      memberCount: r._count.memberRoles,
    })),
  })
}

export async function POST(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'role.create')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const { name, description, color, permissionKeys = [] } = await request.json()
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const perms = await prisma.permission.findMany({
    where: { key: { in: permissionKeys }, isDeprecated: false }, select: { id: true },
  })
  try {
    const role = await prisma.role.create({
      data: {
        organizationId: orgId, name, description: description ?? null, color: color ?? null,
        isSystem: false,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
    })
    return NextResponse.json({ role: { id: role.id } }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Role name already exists' }, { status: 409 })
    throw e
  }
}
```

- [ ] **Step 3: Manual verification**

Run (dev server up on 3500, replace `<ORG>` with a real org id, `$BEARER` with `BEARER_TOKEN`):
```bash
curl -s localhost:3500/api/rbac/permissions | head -c 200
curl -s -H "Authorization: Bearer $BEARER" localhost:3500/api/rbac/orgs/<ORG>/roles | head -c 300
```
Expected: catalog JSON; roles list including the seeded system roles with `memberCount`.

- [ ] **Step 4: Commit**

```bash
cd qb-auth && git add src/app/api/rbac/permissions src/app/api/rbac/orgs && git commit -m "feat(rbac): catalog + roles list/create endpoints"
```

---

### Task 8: Role edit/delete endpoint

**Files:**
- Create: `qb-auth/src/app/api/rbac/roles/[roleId]/route.ts`

**Interfaces:**
- `PATCH /api/rbac/roles/:roleId` body `{ name?, description?, color?, permissionKeys?: string[] }`. System role ⇒ only `isSystemAdmin` may edit; otherwise requires `role.edit`. When `permissionKeys` provided, replace the role's permissions.
- `DELETE /api/rbac/roles/:roleId` — custom role only (system role → 400). Requires `role.delete`. Blocked (409) if `memberRoles` exist.

- [ ] **Step 1: Write `roles/[roleId]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'

type Params = { params: Promise<{ roleId: string }> }

async function actor() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function PATCH(request: Request, { params }: Params) {
  const { roleId } = await params
  const user = await actor()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  if (role.isSystem && !user.isSystemAdmin) {
    return NextResponse.json({ error: 'System roles can only be edited by a system admin' }, { status: 403 })
  }
  if (!role.isSystem) {
    const rbac = await resolveRbac(user.id, role.organizationId)
    if (!can(rbac, 'role.edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, description, color, permissionKeys } = await request.json()
  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color !== undefined ? { color } : {}),
      },
    })
    if (Array.isArray(permissionKeys)) {
      const perms = await tx.permission.findMany({
        where: { key: { in: permissionKeys }, isDeprecated: false }, select: { id: true },
      })
      await tx.rolePermission.deleteMany({ where: { roleId } })
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId, permissionId: p.id })), skipDuplicates: true,
      })
    }
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: Params) {
  const { roleId } = await params
  const user = await actor()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = await prisma.role.findUnique({
    where: { id: roleId }, include: { _count: { select: { memberRoles: true } } },
  })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  if (role.isSystem) return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })

  const rbac = await resolveRbac(user.id, role.organizationId)
  if (!can(rbac, 'role.delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (role._count.memberRoles > 0) {
    return NextResponse.json({ error: 'Role has members assigned; reassign them first' }, { status: 409 })
  }
  await prisma.role.delete({ where: { id: roleId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Manual verification**

Create a custom role (Task 7 POST), then PATCH its permissions and DELETE it; confirm a system role PATCH returns 403 for a non-system-admin and DELETE returns 400.

- [ ] **Step 3: Commit**

```bash
cd qb-auth && git add src/app/api/rbac/roles && git commit -m "feat(rbac): role edit/delete endpoint with system-role guard"
```

---

### Task 9: Members list + assign-roles endpoints

**Files:**
- Create: `qb-auth/src/app/api/rbac/orgs/[orgId]/members/route.ts`
- Create: `qb-auth/src/app/api/rbac/orgs/[orgId]/members/[memberId]/roles/route.ts`

**Interfaces:**
- `GET /api/rbac/orgs/:orgId/members` → `{ members: { id, user:{id,name,email,image}, legacyRole:string, roles:{ id,name, scopeAllProperties:boolean, propertyIds:string[] }[] }[] }`. Requires `member.read`.
- `PUT /api/rbac/orgs/:orgId/members/:memberId/roles` body `{ assignments: { roleId:string, scopeAllProperties:boolean, propertyIds:string[] }[] }` → replaces the member's `MemberRole` rows. Requires `member.assignRole`. Also syncs `Member.role` string to the highest-precedence assigned system role name (owner>admin>staff>agent) for back-compat.
- `DELETE /api/rbac/orgs/:orgId/members/:memberId` (in the members route file) → removes the member. Requires `member.remove`.

- [ ] **Step 1: Write `members/route.ts`** (reuse the `gate` helper shape from Task 7)

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'

type Params = { params: Promise<{ orgId: string }> }

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]; const expected = process.env.BEARER_TOKEN || ''
  return !!token && !!expected && token === expected
}
async function gate(request: Request, orgId: string, perm: string) {
  if (isServiceAuth(request)) return { ok: true as const }
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const rbac = await resolveRbac(session.user.id, orgId)
  if (!can(rbac, perm)) return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const }
}

export async function GET(request: Request, { params }: Params) {
  const { orgId } = await params
  const g = await gate(request, orgId, 'member.read')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })

  const members = await prisma.member.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      memberRoles: { include: { role: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id, user: m.user, legacyRole: m.role,
      roles: m.memberRoles.map((mr) => ({
        id: mr.role.id, name: mr.role.name,
        scopeAllProperties: mr.scopeAllProperties,
        propertyIds: Array.isArray(mr.propertyIds) ? mr.propertyIds : [],
      })),
    })),
  })
}

export async function DELETE(request: Request, { params }: Params) {
  const { orgId } = await params
  // memberId passed as ?memberId= for this collection-level DELETE
  const memberId = new URL(request.url).searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  const g = await gate(request, orgId, 'member.remove')
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status })
  await prisma.member.delete({ where: { id: memberId } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write `members/[memberId]/roles/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveRbac } from '@/rbac/resolve-permissions'
import { can } from '@/rbac/can'

type Params = { params: Promise<{ orgId: string; memberId: string }> }
const PRECEDENCE = ['owner', 'admin', 'staff', 'agent']

function isServiceAuth(request: Request): boolean {
  const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const token = m?.[1]; const expected = process.env.BEARER_TOKEN || ''
  return !!token && !!expected && token === expected
}

export async function PUT(request: Request, { params }: Params) {
  const { orgId, memberId } = await params
  if (!isServiceAuth(request)) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const rbac = await resolveRbac(session.user.id, orgId)
    if (!can(rbac, 'member.assignRole')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { assignments = [] } = await request.json() as {
    assignments: { roleId: string; scopeAllProperties: boolean; propertyIds: string[] }[]
  }
  const roles = await prisma.role.findMany({
    where: { id: { in: assignments.map((a) => a.roleId) }, organizationId: orgId },
    select: { id: true, name: true },
  })
  const validIds = new Set(roles.map((r) => r.id))
  const valid = assignments.filter((a) => validIds.has(a.roleId))

  await prisma.$transaction(async (tx) => {
    await tx.memberRole.deleteMany({ where: { memberId } })
    for (const a of valid) {
      await tx.memberRole.create({
        data: {
          memberId, roleId: a.roleId,
          scopeAllProperties: a.scopeAllProperties,
          propertyIds: a.scopeAllProperties ? [] : a.propertyIds,
        },
      })
    }
    // Sync legacy Member.role to highest-precedence system role assigned.
    const names = roles.filter((r) => validIds.has(r.id)).map((r) => r.name)
    const legacy = PRECEDENCE.find((p) => names.includes(p)) ?? names[0] ?? 'agent'
    await tx.member.update({ where: { id: memberId }, data: { role: legacy } })
  })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Manual verification**

`GET .../members` lists members with their roles. `PUT .../members/<id>/roles` with one system + one custom role updates assignments; re-`GET` reflects it and `Member.role` follows precedence.

- [ ] **Step 4: Commit**

```bash
cd qb-auth && git add src/app/api/rbac/orgs/*/members && git commit -m "feat(rbac): members list + assign-roles + remove endpoints"
```

---

### Task 10: Extend invitation create + accept with role/scope

**Files:**
- Modify: `qb-auth/src/app/api/organizations/[orgId]/invitations/route.ts` (POST)
- Modify: `qb-auth/src/app/api/invitations/accept/route.ts` (POST accept handler)

**Interfaces:**
- Consumes: existing invitation flow + `Invitation.roleId/propertyIds/scopeAllProperties` columns (Task 1).
- Produces: invitations carry an optional `roleId` + scope; accepting creates a `MemberRole`.

- [ ] **Step 1: Extend invitation POST**

In the POST handler of `organizations/[orgId]/invitations/route.ts`, after reading `body`, also read `roleId`, `propertyIds = []`, `scopeAllProperties = true`. Validate `roleId` (if provided) belongs to the org:
```ts
const { email, role = 'agent', roleId, propertyIds = [], scopeAllProperties = true } = body
let resolvedRoleId: string | null = null
if (roleId) {
  const r = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId }, select: { id: true } })
  if (!r) return NextResponse.json({ error: 'Invalid roleId' }, { status: 400 })
  resolvedRoleId = r.id
}
```
Add to the `prisma.invitation.create({ data: { ... } })` call:
```ts
  roleId: resolvedRoleId,
  propertyIds: scopeAllProperties ? [] : propertyIds,
  scopeAllProperties,
```
(The `role` string still flows to the email exactly as today — qb-notify untouched.)

- [ ] **Step 2: Create MemberRole on accept**

Locate the accept POST handler (the block that creates the `Member` after a user accepts). Read the invitation including the new columns. After the `Member` is created/ensured, add:
```ts
if (invitation.roleId) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: acceptingUserId, organizationId: invitation.organizationId } },
    select: { id: true },
  })
  if (member) {
    await prisma.memberRole.upsert({
      where: { memberId_roleId: { memberId: member.id, roleId: invitation.roleId } },
      update: {
        scopeAllProperties: invitation.scopeAllProperties,
        propertyIds: invitation.scopeAllProperties ? [] : (invitation.propertyIds as string[]),
      },
      create: {
        memberId: member.id, roleId: invitation.roleId,
        scopeAllProperties: invitation.scopeAllProperties,
        propertyIds: invitation.scopeAllProperties ? [] : (invitation.propertyIds as string[]),
      },
    })
  }
}
```
(`acceptingUserId` = the variable already holding the session user id in that handler.)

- [ ] **Step 3: Manual verification**

Create an invitation with a `roleId` + two `propertyIds` + `scopeAllProperties:false`; accept it with a test user; confirm a `MemberRole` row exists with the scoped `propertyIds`.

- [ ] **Step 4: Commit**

```bash
cd qb-auth && git add src/app/api/organizations src/app/api/invitations && git commit -m "feat(rbac): invitations carry roleId+scope; accept creates MemberRole"
```

---

### Task 11: verify-session returns `rbac` for the active org

**Files:**
- Modify: `qb-auth/src/app/api/verify-session/route.ts`

**Interfaces:**
- Consumes: `resolveRbac`.
- Produces: the verify-session JSON gains `rbac: ResolvedRbac` (for `session.activeOrganizationId`).

- [ ] **Step 1: Add rbac to the response**

In the GET handler, after the session + memberships are resolved and before the final `NextResponse.json(...)`, add:
```ts
import { resolveRbac } from '@/rbac/resolve-permissions'
// ...
const rbac = await resolveRbac(session.user.id, session.session.activeOrganizationId ?? null)
```
Add `rbac` to the returned object: `return NextResponse.json({ ..., rbac })`.

- [ ] **Step 2: Manual verification**

With a logged-in session cookie:
```bash
curl -s --cookie "qb.session_token=<TOKEN>" localhost:3500/api/verify-session | python3 -m json.tool | grep -A6 '"rbac"'
```
Expected: an `rbac` object with `org`, `wildcard`, `global`, `byProperty`.

- [ ] **Step 3: Commit**

```bash
cd qb-auth && git add src/app/api/verify-session/route.ts && git commit -m "feat(rbac): verify-session returns resolved rbac for active org"
```

---

## PHASE 3 — qb-back enforcement

### Task 12: `can()` + `requirePermission` middleware

**Files:**
- Create: `qb-back/src/rbac/can.ts`
- Create: `qb-back/src/rbac/types.ts`
- Create: `qb-back/src/middleware/require-permission.ts`
- Test: `qb-back/src/middleware/__tests__/require-permission.test.ts`

**Interfaces:**
- Consumes: `req.auth.rbac` (set in Task 13).
- Produces: `requirePermission(perm: string, getPropertyId?: (req) => string | undefined): RequestHandler`.

- [ ] **Step 1: Copy `types.ts` + `can.ts`** (identical to qb-auth Task 2/3)

`qb-back/src/rbac/types.ts`:
```ts
export interface ResolvedRbac {
  org: string | null
  wildcard: boolean
  global: string[]
  byProperty: Record<string, string[]>
}
```
`qb-back/src/rbac/can.ts`:
```ts
import type { ResolvedRbac } from './types'
export function can(rbac: ResolvedRbac | null | undefined, permission: string, propertyId?: string): boolean {
  if (!rbac) return false
  if (rbac.wildcard) return true
  if (rbac.global.includes(permission)) return true
  if (propertyId && rbac.byProperty[propertyId]?.includes(permission)) return true
  return false
}
```

- [ ] **Step 2: Write failing middleware test**

`qb-back/src/middleware/__tests__/require-permission.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { requirePermission } from '../require-permission'

const mockRes = () => {
  const res: any = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('requirePermission', () => {
  it('401 when no rbac', () => {
    const req: any = { auth: {} }
    const res = mockRes(); const next = vi.fn()
    requirePermission('property.edit')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it('passes on wildcard', () => {
    const req: any = { auth: { rbac: { wildcard: true, global: [], byProperty: {} } } }
    const res = mockRes(); const next = vi.fn()
    requirePermission('property.edit')(req, res, next)
    expect(next).toHaveBeenCalled()
  })
  it('passes on global permission', () => {
    const req: any = { auth: { rbac: { wildcard: false, global: ['property.read'], byProperty: {} } } }
    const res = mockRes(); const next = vi.fn()
    requirePermission('property.read')(req, res, next)
    expect(next).toHaveBeenCalled()
  })
  it('property-scoped check uses getPropertyId', () => {
    const req: any = { params: { id: 'p1' }, auth: { rbac: { wildcard: false, global: [], byProperty: { p1: ['property.edit'] } } } }
    const res = mockRes(); const next = vi.fn()
    requirePermission('property.edit', (r) => r.params.id)(req, res, next)
    expect(next).toHaveBeenCalled()
  })
  it('denies when scoped property does not match', () => {
    const req: any = { params: { id: 'p2' }, auth: { rbac: { wildcard: false, global: [], byProperty: { p1: ['property.edit'] } } } }
    const res = mockRes(); const next = vi.fn()
    requirePermission('property.edit', (r) => r.params.id)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
```

- [ ] **Step 3: Run → fails**

Run: `cd qb-back && npx vitest run src/middleware/__tests__/require-permission.test.ts`
Expected: FAIL.

- [ ] **Step 4: Write `require-permission.ts`**

```ts
import { Request, Response, NextFunction, RequestHandler } from 'express'
import { can } from '../rbac/can'
import type { ResolvedRbac } from '../rbac/types'

export function requirePermission(
  permission: string,
  getPropertyId?: (req: Request) => string | undefined,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth
    // Legacy/bearer/test/apiKey service auth without rbac → treat as full trust
    // ONLY for non-session service callers that predate RBAC.
    if (auth && (auth.type === 'bearer-legacy' || auth.type === 'test' || auth.type === 'apiKey')) {
      return next()
    }
    const rbac = auth?.rbac as ResolvedRbac | undefined
    const propertyId = getPropertyId?.(req)
    if (can(rbac, permission, propertyId)) return next()
    return res.status(403).json({ message: 'Forbidden', permission })
  }
}
```

- [ ] **Step 5: Run → passes**

Run: `cd qb-back && npx vitest run src/middleware/__tests__/require-permission.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd qb-back && git add src/rbac src/middleware/require-permission.ts src/middleware/__tests__/require-permission.test.ts && git commit -m "feat(rbac): can() + requirePermission middleware"
```

---

### Task 13: Expose `req.auth.rbac` in qb-back auth middleware

**Files:**
- Modify: `qb-back/src/middleware/auth.ts`

**Interfaces:**
- Produces: `req.auth.rbac` set on both the session-cookie path and the Pattern B service-JWT path.

- [ ] **Step 1: Session-cookie path**

In `authMiddleware`, where `cached.ok` builds `(req as any).auth = { type: 'session', ... }`, add `rbac: (cached as any).rbac ?? null`. Then where the cache is populated from `qbAuth.verifySession(...)`, capture rbac:
```ts
if (result?.valid && result.user && result.session) {
  cached = {
    ok: true, user: result.user, session: result.session,
    memberships: result.memberships ?? [],
    rbac: (result as any).rbac ?? null,
  } as any
}
```
(Update the `CachedSessionOk` interface to include `rbac?: any`.)

- [ ] **Step 2: Service-JWT path**

Where the Pattern B branch builds `(req as any).auth = { type: 'service', ... }`, add:
```ts
  rbac: (payload as any).rbac ?? null,
```

- [ ] **Step 3: Typecheck**

Run: `cd qb-back && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd qb-back && git add src/middleware/auth.ts && git commit -m "feat(rbac): expose req.auth.rbac on session + service-jwt paths"
```

---

### Task 14: Apply `requirePermission` to MVP routes

**Files:**
- Modify: `qb-back/src/modules/properties/routes.ts`
- Modify: `qb-back/src/modules/media/routes.ts` (and rate/finance route files if separate)

**Interfaces:**
- Consumes: `requirePermission` (Task 12).

- [ ] **Step 1: Gate property routes**

In `properties/routes.ts`, import `requirePermission` and add it before the controller on each route. Examples (match the file's existing router calls; `getPropertyId` extracts the property id param the route already uses):
```ts
import { requirePermission } from '../../middleware/require-permission'
// list/read
router.get('/properties', requirePermission('property.read'), /* existing handler */)
router.get('/properties/:id', requirePermission('property.read', (r) => r.params.id), /* ... */)
// mutations
router.post('/properties', requirePermission('property.create'), /* ... */)
router.patch('/properties/:id', requirePermission('property.edit', (r) => r.params.id), /* ... */)
router.delete('/properties/:id', requirePermission('property.delete', (r) => r.params.id), /* ... */)
// room types / rooms (propertyId from the route's param/body)
router.patch('/room-types/:id', requirePermission('roomType.edit'), /* ... */)
```
Do NOT add any permission to `reservation` routes. For routes whose property id is not a direct param, omit `getPropertyId` (falls back to `global`-only check) rather than guessing.

- [ ] **Step 2: Gate media + rate routes**

In the media routes file, gate with `media.read` (GET), `media.upload` (POST upload/link), `media.edit` (PATCH), `media.delete` (DELETE). In rate/pricing routes gate with `rate.read`/`rate.edit`/`pricing.manage`. Finance read routes → `finance.read` (leave the existing `test-token` bypass intact — it is handled inside `requirePermission` via `auth.type === 'test'`).

- [ ] **Step 3: Smoke test build + a gated call**

Run: `cd qb-back && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20` → no errors.
With a service JWT lacking `property.edit`, `PATCH /api/properties/:id` returns 403; with wildcard (system admin) it passes.

- [ ] **Step 4: Commit**

```bash
cd qb-back && git add src/modules && git commit -m "feat(rbac): enforce permissions on property/media/rate/finance routes"
```

---

## PHASE 4 — qb-panel management UI

### Task 15: Session rbac plumbing + JWT claim + `can()` helper

**Files:**
- Create: `qb-panel/src/lib/rbac/can.ts`
- Create: `qb-panel/src/lib/rbac/types.ts`
- Modify: `qb-panel/src/lib/session.ts`
- Modify: `qb-panel/src/lib/qb-back.ts`

**Interfaces:**
- Produces: `UserSession.rbac?: ResolvedRbac`; `qbBackFetch`/`mintBackendBearer` embed `claims.rbac`; `can()` available to server actions + components.

- [ ] **Step 1: Add `types.ts` + `can.ts`** (identical signature to qb-auth/qb-back)

`qb-panel/src/lib/rbac/types.ts`:
```ts
export interface ResolvedRbac {
  org: string | null
  wildcard: boolean
  global: string[]
  byProperty: Record<string, string[]>
}
```
`qb-panel/src/lib/rbac/can.ts`:
```ts
import type { ResolvedRbac } from './types'
export function can(rbac: ResolvedRbac | null | undefined, permission: string, propertyId?: string): boolean {
  if (!rbac) return false
  if (rbac.wildcard) return true
  if (rbac.global.includes(permission)) return true
  if (propertyId && rbac.byProperty[propertyId]?.includes(permission)) return true
  return false
}
```

- [ ] **Step 2: Thread rbac through `session.ts`**

In `session.ts`: add `import type { ResolvedRbac } from '@/lib/rbac/types'`. Add `rbac?: ResolvedRbac` to `interface UserSession` and to `interface VerifySessionResponse`. Where the verified response is mapped into `UserSession`, include `rbac: data.rbac`.

- [ ] **Step 3: Embed rbac claim in `qb-back.ts`**

In `mintPanelApiToken`, after populating session claims, add:
```ts
if (session?.rbac) claims.rbac = session.rbac
```
(Add `rbac?: unknown` to the `PanelApiClaims` interface.)

- [ ] **Step 4: Typecheck**

Run: `cd qb-panel && npx tsc --noEmit 2>&1 | head -20`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd qb-panel && git add src/lib/rbac src/lib/session.ts src/lib/qb-back.ts && git commit -m "feat(rbac): thread resolved rbac through panel session + qb-back claims"
```

---

### Task 16: `rbac.server.ts` server actions

**Files:**
- Create: `qb-panel/src/server/rbac.server.ts`

**Interfaces:**
- Consumes: qb-auth RBAC endpoints over `BEARER_TOKEN` (same pattern as `invitations.server.ts`), `getSession`, `can`.
- Produces server actions:
  - `listPermissionCatalog(): Promise<{ ok:true; permissions:PermissionEntry[] } | { ok:false; error }>`
  - `listRoles(orgId): {...roles}` / `createRole(orgId, input)` / `updateRole(roleId, input)` / `deleteRole(roleId)`
  - `listMembers(orgId)` / `updateMemberRoles(orgId, memberId, assignments)` / `removeMember(orgId, memberId)`
  - `inviteMember(orgId, { email, roleId, scopeAllProperties, propertyIds })` (delegates to the existing invitations endpoint with the new fields).

- [ ] **Step 1: Write `rbac.server.ts`**

```ts
'use server'

import { getSession } from '@/lib/session'

const AUTHCENTER_URL = process.env.AUTHCENTER_URL!
const svc = () => ({ Authorization: `Bearer ${process.env.BEARER_TOKEN}`, 'Content-Type': 'application/json' })

export type PermissionEntry = {
  key: string; resource: string; action: string; service: string; group: string
  label: { es: string; en: string }
}
export type RoleRow = {
  id: string; name: string; description: string | null; color: string | null
  isSystem: boolean; permissionKeys: string[]; memberCount: number
}
export type MemberRow = {
  id: string; user: { id: string; name: string; email: string; image: string | null }
  legacyRole: string
  roles: { id: string; name: string; scopeAllProperties: boolean; propertyIds: string[] }[]
}
export type RoleAssignment = { roleId: string; scopeAllProperties: boolean; propertyIds: string[] }

async function getJson<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const r = await fetch(`${AUTHCENTER_URL}${path}`, { headers: svc(), cache: 'no-store' })
  if (!r.ok) return { ok: false, error: `Request failed (${r.status})` }
  return { ok: true, data: (await r.json()) as T }
}

export async function listPermissionCatalog() {
  const r = await getJson<{ permissions: PermissionEntry[] }>('/api/rbac/permissions')
  return r.ok ? { ok: true as const, permissions: r.data.permissions } : r
}

export async function listRoles(orgId: string) {
  const r = await getJson<{ roles: RoleRow[] }>(`/api/rbac/orgs/${orgId}/roles`)
  return r.ok ? { ok: true as const, roles: r.data.roles } : r
}

export async function createRole(orgId: string, input: { name: string; description?: string; color?: string; permissionKeys: string[] }) {
  const r = await fetch(`${AUTHCENTER_URL}/api/rbac/orgs/${orgId}/roles`, { method: 'POST', headers: svc(), body: JSON.stringify(input) })
  if (!r.ok) return { ok: false as const, error: (await r.json().catch(() => ({}))).error ?? 'Failed to create role' }
  return { ok: true as const }
}

export async function updateRole(roleId: string, input: { name?: string; description?: string; color?: string; permissionKeys?: string[] }) {
  const r = await fetch(`${AUTHCENTER_URL}/api/rbac/roles/${roleId}`, { method: 'PATCH', headers: svc(), body: JSON.stringify(input) })
  if (!r.ok) return { ok: false as const, error: (await r.json().catch(() => ({}))).error ?? 'Failed to update role' }
  return { ok: true as const }
}

export async function deleteRole(roleId: string) {
  const r = await fetch(`${AUTHCENTER_URL}/api/rbac/roles/${roleId}`, { method: 'DELETE', headers: svc() })
  if (!r.ok) return { ok: false as const, error: (await r.json().catch(() => ({}))).error ?? 'Failed to delete role' }
  return { ok: true as const }
}

export async function listMembers(orgId: string) {
  const r = await getJson<{ members: MemberRow[] }>(`/api/rbac/orgs/${orgId}/members`)
  return r.ok ? { ok: true as const, members: r.data.members } : r
}

export async function updateMemberRoles(orgId: string, memberId: string, assignments: RoleAssignment[]) {
  const r = await fetch(`${AUTHCENTER_URL}/api/rbac/orgs/${orgId}/members/${memberId}/roles`, { method: 'PUT', headers: svc(), body: JSON.stringify({ assignments }) })
  if (!r.ok) return { ok: false as const, error: 'Failed to update member roles' }
  return { ok: true as const }
}

export async function removeMember(orgId: string, memberId: string) {
  const r = await fetch(`${AUTHCENTER_URL}/api/rbac/orgs/${orgId}/members?memberId=${encodeURIComponent(memberId)}`, { method: 'DELETE', headers: svc() })
  if (!r.ok) return { ok: false as const, error: 'Failed to remove member' }
  return { ok: true as const }
}

export async function inviteMember(orgId: string, input: { email: string; roleId: string; scopeAllProperties: boolean; propertyIds: string[]; role?: string }) {
  const r = await fetch(`${AUTHCENTER_URL}/api/organizations/${orgId}/invitations`, {
    method: 'POST', headers: svc(),
    body: JSON.stringify({ email: input.email, role: input.role ?? 'agent', roleId: input.roleId, scopeAllProperties: input.scopeAllProperties, propertyIds: input.propertyIds }),
  })
  if (!r.ok) return { ok: false as const, error: (await r.json().catch(() => ({}))).error ?? 'Failed to invite' }
  return { ok: true as const }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd qb-panel && npx tsc --noEmit 2>&1 | head -20`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd qb-panel && git add src/server/rbac.server.ts && git commit -m "feat(rbac): panel server actions for roles/members/invitations"
```

---

### Task 17: Roles route + UI (list + create/edit + delete)

**Files:**
- Create: `qb-panel/src/app/(dashboard)/dashboard/organization/[orgSlug]/roles/page.tsx`
- Create: `qb-panel/src/components/rbac/roles-manager.component.tsx`
- Create: `qb-panel/src/components/rbac/role-editor-drawer.component.tsx`

**Interfaces:**
- Consumes: `listRoles`, `createRole`, `updateRole`, `deleteRole`, `listPermissionCatalog`, the panel `can()` + session.

- [ ] **Step 1: Route page (server component)**

`roles/page.tsx`:
```tsx
import { getSession } from '@/lib/session'
import { resolveOrgBySlug } from '@/server/organization.server' // existing helper used by other org pages
import { listRoles, listPermissionCatalog } from '@/server/rbac.server'
import { can } from '@/lib/rbac/can'
import { RolesManager } from '@/components/rbac/roles-manager.component'
import { notFound } from 'next/navigation'

export default async function RolesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getSession()
  const org = await resolveOrgBySlug(orgSlug)
  if (!org) notFound()
  if (!can(session?.rbac, 'role.read')) return <div className="p-6 text-default-500">No tienes permiso para ver roles.</div>

  const [roles, catalog] = await Promise.all([listRoles(org.id), listPermissionCatalog()])
  return (
    <RolesManager
      orgId={org.id}
      initialRoles={roles.ok ? roles.roles : []}
      catalog={catalog.ok ? catalog.permissions : []}
      canCreate={can(session?.rbac, 'role.create')}
      canEdit={can(session?.rbac, 'role.edit')}
      canDelete={can(session?.rbac, 'role.delete')}
      isSystemAdmin={!!session?.user.isSystemAdmin}
    />
  )
}
```
> If `resolveOrgBySlug` does not exist under that exact name, use the same org-resolution call the sibling `reservations/page.tsx` uses (read it first and match it).

- [ ] **Step 2: `roles-manager.component.tsx` (client)**

Build a HeroUI list/table of roles: system roles with a "Sistema" chip (read-only unless `isSystemAdmin`), custom roles with edit/delete. "Crear rol" button (visible when `canCreate`). Clicking create/edit opens `RoleEditorDrawer`. Delete calls `deleteRole` then refreshes (router.refresh()); on 409 show the "reassign members" toast. Group display uses each role's `permissionKeys.length` as a count chip. Use the existing toast pattern (`addToast` from `@heroui/toast`).

- [ ] **Step 3: `role-editor-drawer.component.tsx` (client)**

HeroUI `Drawer` (mobile rule = drawer, not modal). Fields: name, color, description. Permission matrix: group the `catalog` by `group`, render an accordion per group with a checkbox per permission (`label.es`). Include a search box filtering by `label.es`/`key`. On save: `createRole` or `updateRole({ permissionKeys })`; then `onSaved()` → `router.refresh()`. Disable all inputs when editing a system role and not `isSystemAdmin`.

- [ ] **Step 4: Build check**

Run: `cd qb-panel && npx tsc --noEmit 2>&1 | head -20` → no new errors.
Manually: visit `/dashboard/organization/<slug>/roles`, create a custom role, toggle permissions, save, delete.

- [ ] **Step 5: Commit**

```bash
cd qb-panel && git add "src/app/(dashboard)/dashboard/organization/[orgSlug]/roles" src/components/rbac/roles-manager.component.tsx src/components/rbac/role-editor-drawer.component.tsx && git commit -m "feat(rbac): roles management UI"
```

---

### Task 18: Members route + UI (table + invite + edit-roles)

**Files:**
- Create: `qb-panel/src/app/(dashboard)/dashboard/organization/[orgSlug]/members/page.tsx`
- Create: `qb-panel/src/components/rbac/members-manager.component.tsx`
- Create: `qb-panel/src/components/rbac/invite-member-drawer.component.tsx`
- Create: `qb-panel/src/components/rbac/member-roles-drawer.component.tsx`

**Interfaces:**
- Consumes: `listMembers`, `inviteMember`, `updateMemberRoles`, `removeMember`, `listRoles`, `listProperties` (existing, for the property-scope picker), panel `can()`.

- [ ] **Step 1: Route page (server component)**

Mirror Task 17's page: gate on `member.read`; fetch `listMembers(org.id)`, `listRoles(org.id)`, and the org's properties via the existing `listProperties(org.id)` server function (used by `org-reservations.server.ts`). Pass `canInvite`/`canAssign`/`canRemove` flags from `can(session?.rbac, ...)` into `MembersManager`.

- [ ] **Step 2: `members-manager.component.tsx` (client)**

HeroUI table: avatar+name, email, role chips, scope cell ("Todas" or "N propiedades"), status (active vs `pending` invite — pending rows come from a parallel `listInvitations` call you can fold in, or keep MVP = active members only and surface invites under a small "Pendientes" section). Actions per row (gated): "Editar roles" → `MemberRolesDrawer`; "Quitar" → confirm → `removeMember`. Top-right "Invitar" button (gated `canInvite`) → `InviteMemberDrawer`.

- [ ] **Step 3: `invite-member-drawer.component.tsx` (client)**

HeroUI `Drawer`: email input; role `Select` (from `roles` list); scope = a `RadioGroup` ("Todas las propiedades" / "Propiedades específicas") + when specific, a multi-select `CheckboxGroup` of properties. Submit → `inviteMember(orgId, { email, roleId, scopeAllProperties, propertyIds, role: <systemRoleNameIfSystem> })`. Success toast "Invitación enviada"; `router.refresh()`.

- [ ] **Step 4: `member-roles-drawer.component.tsx` (client)**

HeroUI `Drawer` listing the member's current `roles`; allow adding a role (Select), per-assignment scope toggle (all / pick properties), and removing a role. Save → build `assignments: RoleAssignment[]` → `updateMemberRoles(orgId, memberId, assignments)`; `router.refresh()`.

- [ ] **Step 5: Build check**

Run: `cd qb-panel && npx tsc --noEmit 2>&1 | head -20` → no new errors.
Manually: visit `/dashboard/organization/<slug>/members`, invite a member with a scoped role, edit a member's roles, remove a member.

- [ ] **Step 6: Commit**

```bash
cd qb-panel && git add "src/app/(dashboard)/dashboard/organization/[orgSlug]/members" src/components/rbac && git commit -m "feat(rbac): members management UI (table + invite + edit roles)"
```

---

### Task 19: Activate dashboard cards + nav links

**Files:**
- Modify: `qb-panel/src/components/home/dashboard-cards.component.tsx`
- Modify: the org sub-navigation component that lists org sections (find it next to where `reservations` is linked).

**Interfaces:**
- Consumes: the new `/members` and `/roles` routes.

- [ ] **Step 1: Point the "Próximamente" cards at the routes**

In `dashboard-cards.component.tsx`, the Members and Permissions QuickActions currently rendered disabled "Próximamente": make them enabled links to `/dashboard/organization/${orgSlug}/members` and `/dashboard/organization/${orgSlug}/roles`. Remove the disabled state + "Próximamente" badge.

- [ ] **Step 2: Add nav entries**

In the org sub-nav, add "Miembros" (icon `lucide--users`) → `/members` and "Roles y permisos" (icon `lucide--shield-check`) → `/roles`, following the exact pattern of the existing `reservations` entry (active-state match, i18n key).

- [ ] **Step 3: i18n keys**

Add the Spanish + English strings used by the new components/nav to the panel messages files (match the existing key namespace, e.g. `members.*`, `roles.*`). No hardcoded user-facing English.

- [ ] **Step 4: Build check + commit**

Run: `cd qb-panel && npx tsc --noEmit 2>&1 | head -20` → no new errors.
```bash
cd qb-panel && git add src/components/home/dashboard-cards.component.tsx src/components && git commit -m "feat(rbac): activate Members/Permissions cards + nav links"
```

---

## Self-Review (completed)

- **Spec coverage:** §1 data model → Task 1; §2 catalog → Tasks 2,6; §3 resolver+claims → Tasks 3,5,11,13,15; §4 panel UI → Tasks 16–19; §5 enforcement → Tasks 7–10 (qb-auth gates), 12–14 (qb-back), 15–18 (panel gates); §6 invitation+migration → Tasks 6,10. System-role bypass + isSystemAdmin-only edit → Tasks 4,8. QBT/profile untouched → no QBT/profile task (correct; enforcement is additive). All covered.
- **Placeholder scan:** no TBD/TODO; every code step shows real code. Two intentional "match the existing call" notes (org-slug resolution, route param names) point the implementer to read a named sibling file — not placeholders.
- **Type consistency:** `ResolvedRbac` identical across qb-auth/qb-back/qb-panel; `can(rbac, perm, propertyId?)` identical; `RoleAssignment`/`MemberRow`/`RoleRow` defined once in `rbac.server.ts` and consumed by Tasks 17–18; endpoint shapes match server-action expectations.

## Out of scope (this delivery)
- Enforcement in QBT, qb-notify, qb-sync (permissions declared only).
- `reservation.*` permissions.
- User-invented permissions.
