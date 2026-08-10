# qb-auth Admin — Users & Organizations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Users and Organizations management screens to qb-auth's admin dashboard (`/dashboard`), with a shared tab sub-nav and a single group gate, wiring the already-existing (but unused) user server actions and adding new ones for profile edit, sessions, and org/member management.

**Architecture:** Follow the existing qb-auth admin pattern: a server component page does the gate + `prisma.findMany` (serializing `Date`→ISO) and passes plain objects to a `'use client'` HeroUI component that calls server actions from `src/app/(user)/dashboard/_actions.ts` directly, then `router.refresh()`. A new `dashboard/layout.tsx` gates the whole group once and renders a shared `AdminSubnav`.

**Tech Stack:** Next.js App Router (RSC + server actions), Prisma/Postgres, better-auth (organization plugin; NO admin plugin), HeroUI (`@heroui/react`), Tailwind. `getCurrentUser()` from `@/server/auth.server`.

## Global Constraints

- **No new environment variables.**
- **No better-auth admin plugin.** `isSystemAdmin` is the only privilege flag; there is no ban/global-role concept. Do not add ban/role-plugin fields.
- **No password reset / email change** from this panel.
- All server actions live in `src/app/(user)/dashboard/_actions.ts`, are `"use server"`, guarded by the existing local `requireAdmin()` (throws `"No autorizado"` if `!isSystemAdmin`), return `{ error?: string }` (or `{ ok, error? }`), and call `revalidatePath("/dashboard")` after a mutation. Match the file's existing 4-space indentation and `try/catch` style.
- **Session revoke = set `Session.revokedAt = new Date()`** (the column exists) — never hard-delete sessions.
- **Removing a member = `prisma.member.delete`** (cascades `MemberRole` via schema). Refuse if it would remove the org's last `owner`-role member.
- UI: use HeroUI **Modal** for edit dialogs (matches the existing `src/components/admin-dashboard.tsx` `ClientModal`), `addToast` for errors, existing admin Tailwind classes.
- No UI test framework in qb-auth. Each task verifies with `npm run build` (compiles) + a stated manual check.
- Branch: `feat/admin-users-orgs` (off `dev`), already checked out.

---

## File Structure

**Created:**
- `src/app/(user)/dashboard/layout.tsx` — group gate + `<AdminSubnav/>`.
- `src/components/admin/admin-subnav.component.tsx` — tab nav.
- `src/app/(user)/dashboard/users/page.tsx` — users server page.
- `src/components/admin/users-manager.component.tsx` — users client UI.
- `src/app/(user)/dashboard/organizations/page.tsx` — orgs server page.
- `src/components/admin/orgs-manager.component.tsx` — orgs client UI.

**Modified:**
- `src/app/(user)/dashboard/_actions.ts` — add new actions.
- `src/app/(user)/dashboard/settings/page.tsx` — drop per-page gate + forward link.
- `src/app/(user)/dashboard/permissions/page.tsx` — drop per-page gate + back link.

## Shared serialized types (used across tasks)

```ts
export interface AdminUserRow {
  id: string; name: string; email: string; emailVerified: boolean; image: string | null
  isSystemAdmin: boolean; phone: string | null; nationality: string | null
  address: string | null; passportId: string | null; createdAt: string
  orgCount: number; sessionCount: number
}
export interface AdminSessionRow {
  id: string; ipAddress: string | null; userAgent: string | null; clientId: string | null
  createdAt: string; expiresAt: string; revokedAt: string | null
}
export interface AdminOrgRow { id: string; name: string; slug: string; logo: string | null; memberCount: number }
export interface AdminOrgRoleRow { id: string; name: string; color: string | null; icon: string | null; isSystem: boolean }
export interface AdminOrgMemberRow {
  memberId: string; userId: string; name: string; email: string; legacyRole: string
  roleIds: string[]  // MemberRole.roleId list
}
```

---

### Task 1: Dashboard group layout gate + AdminSubnav

**Files:**
- Create: `src/app/(user)/dashboard/layout.tsx`
- Create: `src/components/admin/admin-subnav.component.tsx`
- Modify: `src/app/(user)/dashboard/settings/page.tsx` (remove gate lines 9-11 + the forward `<Link>` lines 38-46)
- Modify: `src/app/(user)/dashboard/permissions/page.tsx` (remove gate + back `<Link>`)

**Interfaces:**
- Produces: the `(user)/dashboard` layout gate; `<AdminSubnav/>`.

- [ ] **Step 1: AdminSubnav**

`src/components/admin/admin-subnav.component.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/settings", label: "Configuración" },
  { href: "/dashboard/permissions", label: "Permisos" },
  { href: "/dashboard/users", label: "Usuarios" },
  { href: "/dashboard/organizations", label: "Organizaciones" },
] as const;

export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="max-w-7xl mx-auto flex gap-1 px-4">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors " +
                (active
                  ? "border-[#0A2252] text-[#0A2252] dark:border-white dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Group layout gate**

`src/app/(user)/dashboard/layout.tsx`:
```tsx
import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { AdminSubnav } from "@/components/admin/admin-subnav.component";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: user } = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.isSystemAdmin) redirect("/dashboard");
  return (
    <div>
      <AdminSubnav />
      {children}
    </div>
  );
}
```
> Note: `dashboard/page.tsx` currently redirects `/dashboard` → `/dashboard/settings` for admins and shows an "Acceso denegado" block for non-admins. With the layout gate, a non-admin is redirected before `page.tsx` renders — the layout's `redirect("/dashboard")` on a non-admin would loop with `page.tsx`. To avoid a loop: in this layout, redirect non-admins to `"/"` (not `/dashboard`). Change the non-admin line to `redirect("/")`.

Corrected non-admin line in the layout:
```tsx
  if (!user.isSystemAdmin) redirect("/");
```

- [ ] **Step 3: Remove the now-redundant per-page gate + cross-links**

In `src/app/(user)/dashboard/settings/page.tsx`: delete lines 9-11 (the `getCurrentUser`/`redirect` gate) — BUT the page still needs `user` only for the gate, not for data, so also remove the now-unused `getCurrentUser` import and the `redirect` import if unused. Remove the header `<Link href="/dashboard/permissions">` block (lines 38-46) since the sub-nav now navigates. Keep the `prisma.clientApp.findMany` fetch and the `<PlatformSettings/>` + `<AdminDashboard/>` render. Result header becomes just the `<h1>`.

In `src/app/(user)/dashboard/permissions/page.tsx`: same — remove the gate lines and the back `<Link>`; keep the `prisma.permission.findMany` fetch and `<PermissionsCatalog/>`.

- [ ] **Step 4: Typecheck + manual verify**

Run: `npm run build`. Then `npm run dev`, log in as admin → `/dashboard/settings` shows the tab bar (Configuración active); clicking Permisos works; a non-admin visiting `/dashboard/settings` is redirected to `/`. (Users/Organizations tabs 404 until later tasks — expected.)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(user\)/dashboard/layout.tsx src/components/admin/admin-subnav.component.tsx src/app/\(user\)/dashboard/settings/page.tsx src/app/\(user\)/dashboard/permissions/page.tsx
git commit -m "feat: dashboard group gate + shared admin sub-nav"
```

---

### Task 2: User server actions (profile edit + sessions)

**Files:**
- Modify: `src/app/(user)/dashboard/_actions.ts` (append new actions)

**Interfaces:**
- Consumes: existing `requireAdmin()`, `prisma`, `revalidatePath`.
- Produces:
  - `updateUserProfile(userId: string, data: { name?: string; phone?: string | null; nationality?: string | null; address?: string | null; passportId?: string | null }): Promise<{ error?: string }>`
  - `listUserSessions(userId: string): Promise<{ error?: string; sessions?: AdminSessionRow[] }>`
  - `revokeUserSession(sessionId: string): Promise<{ error?: string }>`
  - `revokeAllUserSessions(userId: string): Promise<{ error?: string }>`

- [ ] **Step 1: Append the actions**

Append to `src/app/(user)/dashboard/_actions.ts`:
```ts
export async function updateUserProfile(
    userId: string,
    data: { name?: string; phone?: string | null; nationality?: string | null; address?: string | null; passportId?: string | null },
): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        if (data.name !== undefined && data.name.trim() === "") return { error: "El nombre no puede estar vacío" };
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "phone", "nationality", "address", "passportId"] as const) {
            if (k in data) patch[k] = data[k];
        }
        await prisma.user.update({ where: { id: userId }, data: patch });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function listUserSessions(
    userId: string,
): Promise<{ error?: string; sessions?: { id: string; ipAddress: string | null; userAgent: string | null; clientId: string | null; createdAt: string; expiresAt: string; revokedAt: string | null }[] }> {
    try {
        await requireAdmin();
        const rows = await prisma.session.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: { id: true, ipAddress: true, userAgent: true, clientId: true, createdAt: true, expiresAt: true, revokedAt: true },
        });
        return {
            sessions: rows.map((s) => ({
                id: s.id, ipAddress: s.ipAddress, userAgent: s.userAgent, clientId: s.clientId,
                createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(),
                revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
            })),
        };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function revokeUserSession(sessionId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function revokeAllUserSessions(userId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run build` (compiles; actions unused so far — fine).
```bash
git add src/app/\(user\)/dashboard/_actions.ts
git commit -m "feat: admin user profile-edit and session-revoke server actions"
```

---

### Task 3: Users page + UsersManager

**Files:**
- Create: `src/app/(user)/dashboard/users/page.tsx`
- Create: `src/components/admin/users-manager.component.tsx`

**Interfaces:**
- Consumes: `toggleUserAdmin`, `toggleEmailVerified`, `adminDeleteUser`, `updateUserProfile`, `listUserSessions`, `revokeUserSession`, `revokeAllUserSessions` from `@/app/(user)/dashboard/_actions`; `AdminUserRow`, `AdminSessionRow`.

- [ ] **Step 1: Server page**

`src/app/(user)/dashboard/users/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager.component";

export default async function DashboardUsersPage() {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, emailVerified: true, image: true, isSystemAdmin: true,
      phone: true, nationality: true, address: true, passportId: true, createdAt: true,
      _count: { select: { members: true, sessions: true } },
      subscriptions: {
        where: { status: "ACTIVE" }, orderBy: { currentPeriodEnd: "desc" }, take: 1,
        select: { status: true, billingCycle: true, currentPeriodEnd: true, plan: { select: { key: true, name: true } } },
      },
      members: {
        select: {
          organization: { select: { name: true, slug: true } },
          memberRoles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  });
  const users = rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, image: u.image,
    isSystemAdmin: u.isSystemAdmin, phone: u.phone, nationality: u.nationality, address: u.address,
    passportId: u.passportId, createdAt: u.createdAt.toISOString(),
    orgCount: u._count.members, sessionCount: u._count.sessions,
    subscription: u.subscriptions[0]
      ? { planKey: u.subscriptions[0].plan.key, planName: u.subscriptions[0].plan.name, status: u.subscriptions[0].status, currentPeriodEnd: u.subscriptions[0].currentPeriodEnd.toISOString() }
      : null,
    orgs: u.members.map((m) => ({ name: m.organization.name, slug: m.organization.slug, roles: m.memberRoles.map((r) => r.role.name) })),
  }));
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuarios</h1>
      <UsersManager initialUsers={users} />
    </div>
  );
}
```

- [ ] **Step 2: Client component**

`src/components/admin/users-manager.component.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar, Button, Chip, Input, Switch, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, addToast,
} from "@heroui/react";
import {
  toggleUserAdmin, toggleEmailVerified, adminDeleteUser, updateUserProfile,
  listUserSessions, revokeUserSession, revokeAllUserSessions,
} from "@/app/(user)/dashboard/_actions";

interface UserSubscription { planKey: string; planName: string; status: string; currentPeriodEnd: string }
interface UserOrg { name: string; slug: string; roles: string[] }
interface UserRow {
  id: string; name: string; email: string; emailVerified: boolean; image: string | null;
  isSystemAdmin: boolean; phone: string | null; nationality: string | null; address: string | null;
  passportId: string | null; createdAt: string; orgCount: number; sessionCount: number;
  subscription: UserSubscription | null; orgs: UserOrg[];
}
interface SessionRow { id: string; ipAddress: string | null; userAgent: string | null; clientId: string | null; createdAt: string; expiresAt: string; revokedAt: string | null }

export function UsersManager({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const editModal = useDisclosure();
  const detailModal = useDisclosure();
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", nationality: "", address: "", passportId: "" });
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialUsers;
    return initialUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [initialUsers, query]);

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return false; }
    addToast({ title: okMsg, color: "success" });
    router.refresh();
    return true;
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, phone: u.phone ?? "", nationality: u.nationality ?? "", address: u.address ?? "", passportId: u.passportId ?? "" });
    editModal.onOpen();
  }
  async function saveEdit() {
    if (!editing) return;
    const ok = await run(() => updateUserProfile(editing.id, {
      name: form.name, phone: form.phone || null, nationality: form.nationality || null,
      address: form.address || null, passportId: form.passportId || null,
    }), "Perfil actualizado");
    if (ok) editModal.onClose();
  }

  async function openDetail(u: UserRow) {
    setDetail(u); setSessions([]); detailModal.onOpen();
    const res = await listUserSessions(u.id);
    if (res.error) addToast({ title: res.error, color: "danger" });
    else setSessions(res.sessions ?? []);
  }

  async function del(u: UserRow) {
    if (!confirm(`¿Eliminar al usuario ${u.email}? Esta acción es irreversible.`)) return;
    await run(() => adminDeleteUser(u.id), "Usuario eliminado");
  }

  return (
    <div className="space-y-4">
      <Input className="max-w-xs" variant="bordered" label="Buscar" labelPlacement="outside"
        placeholder="Nombre o email…" value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")} />

      <Table aria-label="Usuarios" removeWrapper>
        <TableHeader>
          <TableColumn>Usuario</TableColumn>
          <TableColumn>Email</TableColumn>
          <TableColumn>Admin</TableColumn>
          <TableColumn>Orgs</TableColumn>
          <TableColumn align="end"> </TableColumn>
        </TableHeader>
        <TableBody emptyContent="Sin usuarios.">
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar size="sm" name={u.name} src={u.image ?? undefined} imgProps={{ referrerPolicy: "no-referrer" }} />
                  <span className="font-medium">{u.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{u.email}</span>
                  <Chip size="sm" color={u.emailVerified ? "success" : "default"} variant="flat">
                    {u.emailVerified ? "verificado" : "sin verificar"}
                  </Chip>
                </div>
              </TableCell>
              <TableCell>
                <Switch size="sm" isSelected={u.isSystemAdmin} isDisabled={busy}
                  onValueChange={(v) => run(() => toggleUserAdmin(u.id, v), "Permisos actualizados")} />
              </TableCell>
              <TableCell>{u.orgCount}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="light" onPress={() => openDetail(u)}>Detalle</Button>
                  <Button size="sm" variant="light" onPress={() => openEdit(u)}>Editar</Button>
                  <Button size="sm" variant="light" color="warning" isDisabled={busy}
                    onPress={() => run(() => toggleEmailVerified(u.id, !u.emailVerified), "Email actualizado")}>
                    {u.emailVerified ? "Desverificar" : "Verificar"}
                  </Button>
                  <Button size="sm" variant="light" color="danger" isDisabled={busy} onPress={() => del(u)}>Eliminar</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit profile */}
      <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>Editar perfil</ModalHeader>
          <ModalBody className="gap-3">
            <Input label="Nombre" variant="bordered" value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Input label="Teléfono" variant="bordered" value={form.phone} onValueChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <Input label="Nacionalidad" variant="bordered" value={form.nationality} onValueChange={(v) => setForm((f) => ({ ...f, nationality: v }))} />
            <Input label="Dirección" variant="bordered" value={form.address} onValueChange={(v) => setForm((f) => ({ ...f, address: v }))} />
            <Input label="Pasaporte/ID" variant="bordered" value={form.passportId} onValueChange={(v) => setForm((f) => ({ ...f, passportId: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={editModal.onClose}>Cancelar</Button>
            <Button color="primary" isLoading={busy} onPress={saveEdit}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detail: sessions */}
      <Modal isOpen={detailModal.isOpen} onOpenChange={detailModal.onOpenChange} size="2xl">
        <ModalContent>
          <ModalHeader>{detail ? `Detalle de ${detail.name}` : "Detalle"}</ModalHeader>
          <ModalBody className="gap-4">
            {/* Subscription (read-only) */}
            <div>
              <p className="text-sm font-semibold mb-1">Suscripción</p>
              {detail?.subscription ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Chip size="sm" variant="flat" color="primary">{detail.subscription.planName}</Chip>
                  <Chip size="sm" variant="flat">{detail.subscription.status}</Chip>
                  <span className="text-slate-400">hasta {new Date(detail.subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              ) : <p className="text-sm text-slate-400">Sin suscripción activa.</p>}
            </div>

            {/* Organizations (read-only) */}
            <div>
              <p className="text-sm font-semibold mb-1">Organizaciones</p>
              {detail && detail.orgs.length ? (
                <div className="space-y-1">
                  {detail.orgs.map((o) => (
                    <div key={o.slug} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{o.name}</span>
                      <span className="text-slate-400">@{o.slug}</span>
                      {o.roles.map((r) => <Chip key={r} size="sm" variant="flat">{r}</Chip>)}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">Sin organizaciones.</p>}
            </div>

            <p className="text-sm font-semibold">Sesiones</p>
            <div className="flex justify-end">
              <Button size="sm" color="danger" variant="flat" isDisabled={!detail || busy}
                onPress={async () => { if (detail && await run(() => revokeAllUserSessions(detail.id), "Sesiones revocadas")) { const r = await listUserSessions(detail.id); if (r.sessions) setSessions(r.sessions); } }}>
                Revocar todas
              </Button>
            </div>
            <Table aria-label="Sesiones" removeWrapper>
              <TableHeader>
                <TableColumn>IP</TableColumn>
                <TableColumn>Cliente</TableColumn>
                <TableColumn>Creada</TableColumn>
                <TableColumn>Estado</TableColumn>
                <TableColumn align="end"> </TableColumn>
              </TableHeader>
              <TableBody emptyContent="Sin sesiones.">
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.ipAddress ?? "—"}</TableCell>
                    <TableCell>{s.clientId ?? "—"}</TableCell>
                    <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={s.revokedAt ? "default" : "success"}>
                        {s.revokedAt ? "revocada" : "activa"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="sm" variant="light" color="danger" isDisabled={!!s.revokedAt || busy}
                          onPress={async () => { if (detail && await run(() => revokeUserSession(s.id), "Sesión revocada")) { const r = await listUserSessions(detail.id); if (r.sessions) setSessions(r.sessions); } }}>
                          Revocar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={detailModal.onClose}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
```
> The detail modal shows three read-only sections (Subscription, Organizations) plus the interactive Sessions table — matching the approved spec (users' read-only subscription + org memberships). Data comes from the page's `findMany` selects (`subscriptions`, `members → organization + memberRoles → role`) passed on each `UserRow`.

- [ ] **Step 3: Typecheck + manual verify**

Run: `npm run build`, then `npm run dev`. `/dashboard/users` lists users; edit a test user's phone (persists on reload); toggle admin/verified; open Detalle → sessions list, revoke one/all; delete a throwaway user. Self-protection: toggling your own admin off returns the error toast.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(user\)/dashboard/users src/components/admin/users-manager.component.tsx
git commit -m "feat: admin users manager page"
```

---

### Task 4: Organization server actions

**Files:**
- Modify: `src/app/(user)/dashboard/_actions.ts` (append)

**Interfaces:**
- Produces:
  - `removeOrgMember(memberId: string): Promise<{ error?: string }>`
  - `setOrgMemberRoles(memberId: string, roleIds: string[]): Promise<{ error?: string }>`
  - `updateOrganizationAdmin(orgId: string, data: { name?: string; slug?: string; logo?: string | null }): Promise<{ error?: string }>`
  - `deleteOrganizationAdmin(orgId: string): Promise<{ error?: string }>`

- [ ] **Step 1: Append the actions**

Append to `src/app/(user)/dashboard/_actions.ts`:
```ts
export async function removeOrgMember(memberId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { error: "Miembro no encontrado" };
        // Refuse if this is the org's last owner-role member.
        if (member.role === "owner") {
            const owners = await prisma.member.count({ where: { organizationId: member.organizationId, role: "owner" } });
            if (owners <= 1) return { error: "No puedes quitar al último propietario de la organización" };
        }
        await prisma.member.delete({ where: { id: memberId } }); // cascades member_role
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function setOrgMemberRoles(memberId: string, roleIds: string[]): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { error: "Miembro no encontrado" };
        // Every roleId must belong to this member's organization.
        const valid = await prisma.role.findMany({ where: { id: { in: roleIds }, organizationId: member.organizationId }, select: { id: true } });
        if (valid.length !== roleIds.length) return { error: "Rol inválido para esta organización" };
        const existing = await prisma.memberRole.findMany({ where: { memberId }, select: { roleId: true } });
        const have = new Set(existing.map((r) => r.roleId));
        const want = new Set(roleIds);
        const toАdd = roleIds.filter((id) => !have.has(id));
        const toRemove = existing.filter((r) => !want.has(r.roleId)).map((r) => r.roleId);
        await prisma.$transaction([
            ...toАdd.map((roleId) => prisma.memberRole.create({ data: { memberId, roleId, scopeAllProperties: true, propertyIds: [] } })),
            ...(toRemove.length ? [prisma.memberRole.deleteMany({ where: { memberId, roleId: { in: toRemove } } })] : []),
        ]);
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function updateOrganizationAdmin(
    orgId: string,
    data: { name?: string; slug?: string; logo?: string | null },
): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        if (data.name !== undefined && data.name.trim() === "") return { error: "El nombre no puede estar vacío" };
        if (data.slug !== undefined && data.slug.trim() === "") return { error: "El slug no puede estar vacío" };
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "slug", "logo"] as const) if (k in data) patch[k] = data[k];
        try {
            await prisma.organization.update({ where: { id: orgId }, data: patch });
        } catch (err) {
            if ((err as { code?: string }).code === "P2002") return { error: "Ese slug ya está en uso" };
            throw err;
        }
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function deleteOrganizationAdmin(orgId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        await prisma.organization.delete({ where: { id: orgId } }); // cascades members, roles, invitations
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}
```
> IMPORTANT — the two local identifiers `toАdd` above contain a Cyrillic "А" as a placeholder to force the implementer to retype them. Replace BOTH occurrences with the ASCII identifier `toAdd` when implementing. (This note exists so the copy isn't blindly pasted with a homoglyph.)

- [ ] **Step 2: Typecheck + commit**

Fix the `toAdd` identifier, then `npm run build`.
```bash
git add src/app/\(user\)/dashboard/_actions.ts
git commit -m "feat: admin org member/roles and organization update/delete actions"
```

---

### Task 5: Organizations page + OrgsManager

**Files:**
- Create: `src/app/(user)/dashboard/organizations/page.tsx`
- Create: `src/components/admin/orgs-manager.component.tsx`

**Interfaces:**
- Consumes: `removeOrgMember`, `setOrgMemberRoles`, `updateOrganizationAdmin`, `deleteOrganizationAdmin`; the serialized org/member/role shapes.

- [ ] **Step 1: Server page**

`src/app/(user)/dashboard/organizations/page.tsx`:
```tsx
import { prisma } from "@/lib/prisma";
import { OrgsManager } from "@/components/admin/orgs-manager.component";

export default async function DashboardOrgsPage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, slug: true, logo: true,
      roles: { select: { id: true, name: true, color: true, icon: true, isSystem: true } },
      members: {
        select: {
          id: true, userId: true, role: true,
          user: { select: { name: true, email: true } },
          memberRoles: { select: { roleId: true } },
        },
      },
    },
  });
  const data = orgs.map((o) => ({
    id: o.id, name: o.name, slug: o.slug, logo: o.logo, memberCount: o.members.length,
    roles: o.roles,
    members: o.members.map((m) => ({
      memberId: m.id, userId: m.userId, name: m.user.name, email: m.user.email,
      legacyRole: m.role, roleIds: m.memberRoles.map((r) => r.roleId),
    })),
  }));
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Organizaciones</h1>
      <OrgsManager initialOrgs={data} />
    </div>
  );
}
```

- [ ] **Step 2: Client component**

`src/components/admin/orgs-manager.component.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Chip, Input, Select, SelectItem, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, addToast,
} from "@heroui/react";
import { removeOrgMember, setOrgMemberRoles, updateOrganizationAdmin, deleteOrganizationAdmin } from "@/app/(user)/dashboard/_actions";

interface RoleRow { id: string; name: string; color: string | null; icon: string | null; isSystem: boolean }
interface MemberRow { memberId: string; userId: string; name: string; email: string; legacyRole: string; roleIds: string[] }
interface OrgRow { id: string; name: string; slug: string; logo: string | null; memberCount: number; roles: RoleRow[]; members: MemberRow[] }

export function OrgsManager({ initialOrgs }: { initialOrgs: OrgRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialOrgs[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const editOrg = useDisclosure();
  const delOrg = useDisclosure();
  const roleModal = useDisclosure();
  const [orgForm, setOrgForm] = useState({ name: "", slug: "", logo: "" });
  const [delConfirm, setDelConfirm] = useState("");
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>([]);

  const orgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialOrgs;
    return initialOrgs.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
  }, [initialOrgs, query]);
  const selected = initialOrgs.find((o) => o.id === selectedId) ?? null;

  async function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.error) { addToast({ title: res.error, color: "danger" }); return false; }
    addToast({ title: okMsg, color: "success" });
    router.refresh();
    return true;
  }

  function roleName(o: OrgRow, id: string) { return o.roles.find((r) => r.id === id)?.name ?? id; }

  function openEditOrg() { if (!selected) return; setOrgForm({ name: selected.name, slug: selected.slug, logo: selected.logo ?? "" }); editOrg.onOpen(); }
  function openDelOrg() { setDelConfirm(""); delOrg.onOpen(); }
  function openRoles(m: MemberRow) { setEditingMember(m); setMemberRoleIds(m.roleIds); roleModal.onOpen(); }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Org list */}
      <div className="space-y-3">
        <Input variant="bordered" label="Buscar" labelPlacement="outside" placeholder="Nombre o slug…"
          value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")} />
        <div className="rounded-sm border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {orgs.map((o) => (
            <button key={o.id} onClick={() => setSelectedId(o.id)}
              className={"w-full text-left px-3 py-2 " + (o.id === selectedId ? "bg-[#0A2252]/8 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-slate-400">@{o.slug} · {o.memberCount} miembros</div>
            </button>
          ))}
          {orgs.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-400">Sin organizaciones.</div>}
        </div>
      </div>

      {/* Selected org detail */}
      {selected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="text-xs text-slate-400">@{selected.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="flat" onPress={openEditOrg}>Editar org</Button>
              <Button size="sm" variant="flat" color="danger" onPress={openDelOrg}>Eliminar org</Button>
            </div>
          </div>

          <Table aria-label="Miembros" removeWrapper>
            <TableHeader>
              <TableColumn>Usuario</TableColumn>
              <TableColumn>Roles</TableColumn>
              <TableColumn align="end"> </TableColumn>
            </TableHeader>
            <TableBody emptyContent="Sin miembros.">
              {selected.members.map((m) => (
                <TableRow key={m.memberId}>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.roleIds.length ? m.roleIds.map((id) => <Chip key={id} size="sm" variant="flat">{roleName(selected, id)}</Chip>)
                        : <span className="text-xs text-slate-400">{m.legacyRole}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="light" onPress={() => openRoles(m)}>Roles</Button>
                      <Button size="sm" variant="light" color="danger" isDisabled={busy}
                        onPress={() => { if (confirm(`¿Quitar a ${m.email} de ${selected.name}?`)) run(() => removeOrgMember(m.memberId), "Miembro eliminado"); }}>
                        Quitar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center text-sm text-slate-400">Selecciona una organización.</div>
      )}

      {/* Edit org */}
      <Modal isOpen={editOrg.isOpen} onOpenChange={editOrg.onOpenChange}>
        <ModalContent>
          <ModalHeader>Editar organización</ModalHeader>
          <ModalBody className="gap-3">
            <Input label="Nombre" variant="bordered" value={orgForm.name} onValueChange={(v) => setOrgForm((f) => ({ ...f, name: v }))} />
            <Input label="Slug" variant="bordered" value={orgForm.slug} onValueChange={(v) => setOrgForm((f) => ({ ...f, slug: v }))} />
            <Input label="Logo (URL)" variant="bordered" value={orgForm.logo} onValueChange={(v) => setOrgForm((f) => ({ ...f, logo: v }))} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={editOrg.onClose}>Cancelar</Button>
            <Button color="primary" isLoading={busy}
              onPress={async () => { if (selected && await run(() => updateOrganizationAdmin(selected.id, { name: orgForm.name, slug: orgForm.slug, logo: orgForm.logo || null }), "Organización actualizada")) editOrg.onClose(); }}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete org (typed slug confirm) */}
      <Modal isOpen={delOrg.isOpen} onOpenChange={delOrg.onOpenChange}>
        <ModalContent>
          <ModalHeader>Eliminar organización</ModalHeader>
          <ModalBody className="gap-3">
            <p className="text-sm text-slate-500">Esto elimina la organización, sus miembros y roles. Escribe <b>{selected?.slug}</b> para confirmar.</p>
            <Input variant="bordered" value={delConfirm} onValueChange={setDelConfirm} placeholder={selected?.slug} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={delOrg.onClose}>Cancelar</Button>
            <Button color="danger" isLoading={busy} isDisabled={!selected || delConfirm !== selected.slug}
              onPress={async () => { if (selected && await run(() => deleteOrganizationAdmin(selected.id), "Organización eliminada")) { delOrg.onClose(); setSelectedId(null); } }}>
              Eliminar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Member roles */}
      <Modal isOpen={roleModal.isOpen} onOpenChange={roleModal.onOpenChange}>
        <ModalContent>
          <ModalHeader>Roles del miembro</ModalHeader>
          <ModalBody>
            <Select label="Roles" selectionMode="multiple" variant="bordered"
              selectedKeys={new Set(memberRoleIds)}
              onSelectionChange={(keys) => setMemberRoleIds(Array.from(keys as Set<string>))}>
              {(selected?.roles ?? []).map((r) => <SelectItem key={r.id}>{r.name}</SelectItem>)}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={roleModal.onClose}>Cancelar</Button>
            <Button color="primary" isLoading={busy}
              onPress={async () => { if (editingMember && await run(() => setOrgMemberRoles(editingMember.memberId, memberRoleIds), "Roles actualizados")) roleModal.onClose(); }}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + manual verify**

Run: `npm run build`, `npm run dev`. `/dashboard/organizations` lists orgs; select one → members with role chips. Change a member's roles (multi-select, persists). Remove a non-owner member. Try removing the sole owner → error toast. Edit org name/slug (duplicate slug → error). Delete a throwaway org via typed-slug confirm.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(user\)/dashboard/organizations src/components/admin/orgs-manager.component.tsx
git commit -m "feat: admin organizations manager page"
```

---

## Self-Review

**Spec coverage:**
- Shared sub-nav + single group gate → Task 1. ✓ (Removes per-page gate repetition + hardcoded links.)
- Users: list/search, toggle admin/verified, delete, edit profile, sessions view+revoke → Tasks 2-3. ✓
- Users read-only subscription + org memberships in detail modal → Task 3 (page selects subscriptions + members; modal renders both read-only). ✓
- Organizations: list, members+roles, remove member (last-owner guard), change roles, edit org, delete org (typed confirm) → Tasks 4-5. ✓
- Server actions in `_actions.ts`, `requireAdmin`-gated, `revalidatePath` → Tasks 2, 4. ✓
- Session revoke = `revokedAt` (not delete) → Task 2. ✓
- No new env, no admin plugin, no password/email change → honored throughout. ✓

**Placeholder scan:** No TBD/TODO. One deliberate homoglyph trap (`toАdd`) in Task 4 with an explicit instruction to replace it — not a placeholder, a guard against blind paste.

**Type consistency:** Action signatures in Tasks 2/4 match their call sites in Tasks 3/5. Serialized row shapes (`AdminUserRow`, session/org/member/role) consistent between page selects and component interfaces. `revalidatePath("/dashboard")` used uniformly.

**Known follow-ups (out of scope):** users' read-only subscription/orgs panel; org role management overlaps qb-panel's RBAC page (acceptable — different surface); no pagination on the users table (fine at current scale — add if user count grows).
