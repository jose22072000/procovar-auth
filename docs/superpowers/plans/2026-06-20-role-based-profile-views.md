# Role-Based Profile Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-view `/profile` page in qb-auth with role-detected views: client dashboard at `/profile`, org/owner dashboard at `/profile/org`, and an extended admin panel at `/dashboard`, plus seed `QB_BOOKING_URL` to fix the nav button.

**Architecture:** Server components detect role via `resolveProfileRole()` — which checks `isSystemAdmin`, org membership, and Owner record existence in qb-back — then redirect or render the appropriate view. All qb-back calls use the existing `BEARER_TOKEN` / `BACKEND_URL` pattern. Data is fetched server-side and passed as props to client components.

**Tech Stack:** Next.js 14 App Router (server components + server actions), HeroUI (`@heroui/react`), TypeScript, Prisma (qb-auth DB), vitest (unit tests), REST calls to qb-back.

## Global Constraints

- UI library: HeroUI — use `Card`, `CardBody`, `CardHeader`, `Chip`, `Button`, `Skeleton` exactly as in existing cards
- Card style (copy verbatim): `className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm"`
- Auth: `getCurrentUser()` from `@/server/auth.server` in server components; `BEARER_TOKEN` + `BACKEND_URL` env vars for qb-back calls
- i18n: `useLanguage()` hook in client components; new translation keys added to **both** `en` and `es` objects in `src/i18n/translations.ts`
- No new env vars — `BACKEND_URL` and `BEARER_TOKEN` already exist
- TypeScript strict — no `any` except when parsing external JSON responses (cast via `as`)
- Commits after each task

---

### Task 1: Seed `QB_BOOKING_URL` + add i18n keys

**Files:**
- Create: `scripts/seed-config.ts`
- Modify: `src/i18n/translations.ts`

**Interfaces:**
- Produces: nothing consumed by other tasks directly; fixes nav bug and adds strings needed in Tasks 4–6

**Note:** The admin dashboard at `/dashboard → System URLs` already has UI to edit `QB_BOOKING_URL`. This task seeds the initial value so the nav works immediately. Admin can update it via UI when domain changes to `.com`.

- [ ] **Step 1: Create seed script**

Create `scripts/seed-config.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.systemConfig.upsert({
        where: { key: 'QB_BOOKING_URL' },
        update: {},
        create: { key: 'QB_BOOKING_URL', value: 'https://hostravel.net' },
    });
    console.log('Seeded QB_BOOKING_URL');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

```bash
cd /home/jose/qb/qb-auth
npx tsx scripts/seed-config.ts
```

Expected output: `Seeded QB_BOOKING_URL`

- [ ] **Step 3: Add i18n keys to `src/i18n/translations.ts`**

Add the following inside the `en` object, after the `cards` block:

```typescript
        clientView: {
            activeStays: "Active Stays",
            completedStays: "Completed Stays",
            totalSpent: "Total Spent",
            favorites: "Favorites",
            upcomingStays: "Upcoming Stays",
            noUpcomingStays: "No upcoming stays",
            upgradeTitle: "Have a property?",
            upgradeDesc: "Start hosting and reach thousands of travelers",
            startHosting: "Start Hosting",
            backToOrg: "Back to my organization",
        },
        orgView: {
            viewAsClient: "View as Client",
            activeProperties: "Active Properties",
            monthlyBookings: "Bookings This Month",
            monthlyIncome: "Income This Month",
            avgRating: "Avg. Rating",
            properties: "Properties",
            noProperties: "No properties yet",
            recentReservations: "Recent Reservations",
            noRecentReservations: "No recent reservations",
            team: "Team",
            finances: "Finances",
            managePanelLink: "Manage in Panel",
            roleOwner: "Owner",
            roleAdmin: "Admin",
            roleStaff: "Staff",
            roleAgent: "Agent",
        },
        adminView: {
            activeProperties: "Active Properties",
            weeklyReservations: "Reservations This Week",
            newUsers: "New Users (7d)",
            activeOrgs: "Active Organizations",
        },
```

Add the same block in the `es` object:

```typescript
        clientView: {
            activeStays: "Estancias activas",
            completedStays: "Estancias completadas",
            totalSpent: "Total gastado",
            favorites: "Favoritos",
            upcomingStays: "Próximas estancias",
            noUpcomingStays: "Sin estancias próximas",
            upgradeTitle: "¿Tienes una propiedad?",
            upgradeDesc: "Empieza a hospedar y llega a miles de viajeros",
            startHosting: "Empezar a hospedar",
            backToOrg: "Volver a mi organización",
        },
        orgView: {
            viewAsClient: "Ver como cliente",
            activeProperties: "Propiedades activas",
            monthlyBookings: "Reservas este mes",
            monthlyIncome: "Ingresos este mes",
            avgRating: "Calificación promedio",
            properties: "Propiedades",
            noProperties: "Sin propiedades aún",
            recentReservations: "Reservas recientes",
            noRecentReservations: "Sin reservas recientes",
            team: "Equipo",
            finances: "Finanzas",
            managePanelLink: "Gestionar en Panel",
            roleOwner: "Propietario",
            roleAdmin: "Administrador",
            roleStaff: "Staff",
            roleAgent: "Agente",
        },
        adminView: {
            activeProperties: "Propiedades activas",
            weeklyReservations: "Reservas esta semana",
            newUsers: "Nuevos usuarios (7d)",
            activeOrgs: "Organizaciones activas",
        },
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/jose/qb/qb-auth
npx tsc --noEmit
```

Expected: no errors (the `as const` on translations will enforce the new shape).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-config.ts src/i18n/translations.ts
git commit -m "feat: seed QB_BOOKING_URL and add role-view i18n keys"
```

---

### Task 2: qb-back fetch functions for org and owner data

**Files:**
- Modify: `src/app/(user)/profile/_actions.ts`

**Interfaces:**
- Produces:
  - `checkOwnerRecord(authUserId: string): Promise<boolean>` — calls `GET /users/owners?authUserId=X`, returns true if at least one record found
  - `BackendProperty` type
  - `BackendPayout` type
  - `fetchOrgProperties(organizationId: string): Promise<{ data: BackendProperty[] | null; error: string | null }>`
  - `fetchOrgReservations(propertyIds: string[], checkInFrom?: string): Promise<{ data: BackendReservation[] | null; error: string | null }>`
  - `fetchOrgPayouts(authUserId: string, paidAtFrom?: string): Promise<{ data: BackendPayout[] | null; error: string | null }>`
  - `fetchPlatformPropertyCount(): Promise<number>` — count of isLive properties (for admin KPI)
  - `fetchPlatformReservationCount(checkInFrom: string): Promise<number>` — count of reservations this week (for admin KPI)

- [ ] **Step 1: Add types and functions to `_actions.ts`**

Append to `src/app/(user)/profile/_actions.ts` after the existing `fetchUserNotifications` function:

```typescript
// ─── Org / Owner data ─────────────────────────────────────────────────────────

export interface BackendProperty {
    id: string;
    name: string;
    slug: string;
    organizationId: string;
    isLive: boolean;
    avgRating: number | null;
    reviewCount: number;
    currency: string;
}

export interface BackendPayout {
    id: string;
    amount: number; // cents
    currency: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
    reason: string;
    paidAt: string | null;
    propertyId: string | null;
}

export interface BackendOwnerMember {
    id: string;
    role: string;
    organizationId: string;
}

/** Returns true if an Owner record exists in qb-back for this authUserId. */
export async function checkOwnerRecord(authUserId: string): Promise<boolean> {
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return false;
        const res = await fetch(
            `${backendUrl}/users/owners?authUserId=${encodeURIComponent(authUserId)}`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) return false;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length > 0;
    } catch {
        return false;
    }
}

export async function fetchOrgProperties(
    organizationId: string
): Promise<{ data: BackendProperty[] | null; error: string | null }> {
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const res = await fetch(
            `${backendUrl}/properties?organizationId=${encodeURIComponent(organizationId)}`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
        }
        const json = await res.json();
        const items: BackendProperty[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchOrgReservations(
    propertyIds: string[],
    checkInFrom?: string
): Promise<{ data: BackendReservation[] | null; error: string | null }> {
    if (propertyIds.length === 0) return { data: [], error: null };
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const results = await Promise.all(
            propertyIds.map(async (pid) => {
                const params = new URLSearchParams({ propertyId: pid });
                if (checkInFrom) params.set('checkInFrom', checkInFrom);
                const res = await fetch(`${backendUrl}/reservations?${params}`, {
                    headers: { Authorization: authHeader() },
                    cache: 'no-store',
                });
                if (!res.ok) return [] as BackendReservation[];
                const json = await res.json();
                return (Array.isArray(json) ? json : (json.data ?? [])) as BackendReservation[];
            })
        );
        return { data: results.flat(), error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchOrgPayouts(
    authUserId: string,
    paidAtFrom?: string
): Promise<{ data: BackendPayout[] | null; error: string | null }> {
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return { data: null, error: 'BACKEND_URL not configured' };
        const params = new URLSearchParams({ ownerAuthUserId: authUserId });
        if (paidAtFrom) params.set('paidAtFrom', paidAtFrom);
        const res = await fetch(`${backendUrl}/finance/payouts?${params}`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { data: null, error: (err as { message?: string }).message ?? `HTTP ${res.status}` };
        }
        const json = await res.json();
        const items: BackendPayout[] = Array.isArray(json) ? json : (json.data ?? []);
        return { data: items, error: null };
    } catch (e: unknown) {
        return { data: null, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

export async function fetchPlatformPropertyCount(): Promise<number> {
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return 0;
        const res = await fetch(`${backendUrl}/properties?isLive=true`, {
            headers: { Authorization: authHeader() },
            cache: 'no-store',
        });
        if (!res.ok) return 0;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length;
    } catch {
        return 0;
    }
}

export async function fetchPlatformReservationCount(checkInFrom: string): Promise<number> {
    try {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) return 0;
        const res = await fetch(
            `${backendUrl}/reservations?checkInFrom=${encodeURIComponent(checkInFrom)}`,
            { headers: { Authorization: authHeader() }, cache: 'no-store' }
        );
        if (!res.ok) return 0;
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json.data ?? []);
        return items.length;
    } catch {
        return 0;
    }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/jose/qb/qb-auth
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(user\)/profile/_actions.ts
git commit -m "feat: add qb-back fetch functions for org/owner/admin data"
```

---

### Task 3: Role resolver + vitest setup

**Files:**
- Create: `src/lib/role-resolver.ts`
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/role-resolver.test.ts`

**Interfaces:**
- Consumes: `checkOwnerRecord(authUserId: string): Promise<boolean>` from `@/app/(user)/profile/_actions`
- Produces: `resolveProfileRole(user: RoleResolverUser): Promise<ProfileRole>`
  - `type ProfileRole = 'admin' | 'org-full' | 'org-restricted' | 'client'`
  - `interface RoleResolverUser { id: string; isSystemAdmin: boolean; members: { role: string; organizationId: string }[] }`

- [ ] **Step 1: Install vitest**

```bash
cd /home/jose/qb/qb-auth
npm install --save-dev vitest @vitest/globals
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing tests**

Create `src/lib/__tests__/role-resolver.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the server action module before importing role-resolver
vi.mock('@/app/(user)/profile/_actions', () => ({
    checkOwnerRecord: vi.fn(),
}));

import { resolveProfileRole, type ProfileRole, type RoleResolverUser } from '../role-resolver';
import { checkOwnerRecord } from '@/app/(user)/profile/_actions';

const mockCheckOwner = vi.mocked(checkOwnerRecord);

const baseUser: RoleResolverUser = {
    id: 'user-1',
    isSystemAdmin: false,
    members: [],
};

describe('resolveProfileRole', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns admin for isSystemAdmin=true regardless of members', async () => {
        mockCheckOwner.mockResolvedValue(false);
        const result = await resolveProfileRole({ ...baseUser, isSystemAdmin: true, members: [] });
        expect(result).toBe<ProfileRole>('admin');
        expect(mockCheckOwner).not.toHaveBeenCalled();
    });

    it('returns client if no org memberships', async () => {
        const result = await resolveProfileRole(baseUser);
        expect(result).toBe<ProfileRole>('client');
        expect(mockCheckOwner).not.toHaveBeenCalled();
    });

    it('returns client if has org but no Owner record in qb-back', async () => {
        mockCheckOwner.mockResolvedValue(false);
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('client');
    });

    it('returns org-full for org member with role owner and Owner record', async () => {
        mockCheckOwner.mockResolvedValue(true);
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-full');
    });

    it('returns org-full for org member with role admin and Owner record', async () => {
        mockCheckOwner.mockResolvedValue(true);
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'admin', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-full');
    });

    it('returns org-restricted for staff with Owner record', async () => {
        mockCheckOwner.mockResolvedValue(true);
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'staff', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-restricted');
    });

    it('returns org-restricted for agent with Owner record', async () => {
        mockCheckOwner.mockResolvedValue(true);
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'agent', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('org-restricted');
    });

    it('returns client if checkOwnerRecord throws', async () => {
        mockCheckOwner.mockRejectedValue(new Error('network error'));
        const user: RoleResolverUser = {
            ...baseUser,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('client');
    });

    it('admin takes priority over org membership', async () => {
        mockCheckOwner.mockResolvedValue(true);
        const user: RoleResolverUser = {
            ...baseUser,
            isSystemAdmin: true,
            members: [{ role: 'owner', organizationId: 'org-1' }],
        };
        const result = await resolveProfileRole(user);
        expect(result).toBe<ProfileRole>('admin');
    });
});
```

- [ ] **Step 5: Run tests to confirm they fail**

```bash
cd /home/jose/qb/qb-auth
npm test
```

Expected: errors like `Cannot find module '../role-resolver'`

- [ ] **Step 6: Create `src/lib/role-resolver.ts`**

```typescript
import { checkOwnerRecord } from '@/app/(user)/profile/_actions';

export type ProfileRole = 'admin' | 'org-full' | 'org-restricted' | 'client';

export interface RoleResolverUser {
    id: string;
    isSystemAdmin: boolean;
    members: { role: string; organizationId: string }[];
}

const ORG_FULL_ROLES = new Set(['owner', 'admin']);

export async function resolveProfileRole(user: RoleResolverUser): Promise<ProfileRole> {
    if (user.isSystemAdmin) return 'admin';
    if (user.members.length === 0) return 'client';

    try {
        const hasOwnerRecord = await checkOwnerRecord(user.id);
        if (!hasOwnerRecord) return 'client';

        const orgRole = user.members[0].role;
        return ORG_FULL_ROLES.has(orgRole) ? 'org-full' : 'org-restricted';
    } catch {
        return 'client';
    }
}
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
cd /home/jose/qb/qb-auth
npm test
```

Expected: `9 passed`

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts src/lib/role-resolver.ts src/lib/__tests__/role-resolver.test.ts package.json package-lock.json
git commit -m "feat: add role resolver with vitest tests"
```

---

### Task 4: Redirect logic in `/profile` + client KPI bar

**Files:**
- Modify: `src/app/(user)/profile/page.tsx`
- Create: `src/components/profile/client-view/kpi-bar.tsx`
- Create: `src/components/profile/client-view/owner-upgrade-cta.tsx`
- Modify: `src/components/profile/profile-content.tsx`

**Interfaces:**
- Consumes: `resolveProfileRole(user)` from `@/lib/role-resolver`
- Consumes: `fetchUserReservations()`, `fetchUserInvoices()` from `./_actions`
- Produces: `ClientKpiBar` component accepting `{ activeCount: number; completedCount: number; totalSpentCents: number }`
- Produces: `OwnerUpgradeCta` component (no props, links to org creation)

- [ ] **Step 1: Replace `src/app/(user)/profile/page.tsx`**

```typescript
import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/profile/profile-content";
import { resolveProfileRole } from "@/lib/role-resolver";
import { fetchUserReservations, fetchUserInvoices } from "./_actions";

export default async function ProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    const params = await searchParams;
    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
        members: (user as any).members ?? [],
    });

    if ((role === 'org-full' || role === 'org-restricted') && params.view !== 'client') {
        redirect('/profile/org');
    }

    // Fetch client KPI data in parallel
    const [resResult, invResult] = await Promise.all([
        fetchUserReservations(),
        fetchUserInvoices(),
    ]);

    const reservations = resResult.data ?? [];
    const invoices = invResult.data ?? [];
    const today = new Date().toISOString().split('T')[0];

    const activeCount = reservations.filter(
        (r) => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
    ).length;
    const completedCount = reservations.filter((r) => r.status === 'CHECKED_OUT').length;
    const totalSpentCents = invoices
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0);

    const upcomingReservations = reservations
        .filter((r) => r.checkIn >= today && (r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'))
        .slice(0, 3);

    const hasOrg = role === 'org-full' || role === 'org-restricted';

    return (
        <ProfileContent
            user={user}
            kpiData={{ activeCount, completedCount, totalSpentCents }}
            upcomingReservations={upcomingReservations}
            showUpgradeCta={!hasOrg}
            isOwnerViewingAsClient={hasOrg}
        />
    );
}
```

- [ ] **Step 2: Create `src/components/profile/client-view/kpi-bar.tsx`**

```typescript
"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import { Icons } from "@/components/icons/iconify";

interface ClientKpiBarProps {
    activeCount: number;
    completedCount: number;
    totalSpentCents: number;
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-sm px-4 py-3 shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-sm shrink-0">{icon}</div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-bold text-black dark:text-white">{value}</p>
            </div>
        </div>
    );
}

export function ClientKpiBar({ activeCount, completedCount, totalSpentCents }: ClientKpiBarProps) {
    const { t } = useLanguage();
    const totalSpent = (totalSpentCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <KpiCard
                icon={<Icons.bed className="size-4 text-blue-600 dark:text-blue-400" />}
                label={t.clientView.activeStays}
                value={String(activeCount)}
            />
            <KpiCard
                icon={<Icons.checkCircle className="size-4 text-green-600 dark:text-green-400" />}
                label={t.clientView.completedStays}
                value={String(completedCount)}
            />
            <KpiCard
                icon={<Icons.wallet className="size-4 text-purple-600 dark:text-purple-400" />}
                label={t.clientView.totalSpent}
                value={totalSpent}
            />
        </div>
    );
}
```

> **Note on icons:** Use `Icons.wallet` if it exists in `src/components/icons/iconify.tsx`; otherwise use `Icons.invoice` or any available icon. Check the existing icons file for available names.

- [ ] **Step 3: Create `src/components/profile/client-view/owner-upgrade-cta.tsx`**

```typescript
"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";

export function OwnerUpgradeCta() {
    const { t } = useLanguage();
    return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 shadow-sm rounded-sm">
            <CardBody className="flex flex-row items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-sm shrink-0">
                        <Icons.property className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-black dark:text-white">{t.clientView.upgradeTitle}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.clientView.upgradeDesc}</p>
                    </div>
                </div>
                <Button
                    as={Link}
                    href="/organizations/create"
                    size="sm"
                    variant="bordered"
                    className="shrink-0 font-medium border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35"
                    startContent={<Icons.plus className="size-4" />}
                >
                    {t.clientView.startHosting}
                </Button>
            </CardBody>
        </Card>
    );
}
```

> **Note:** Change `href="/organizations/create"` to whatever the actual org creation route is in qb-auth. Check `src/app/(user)/` for org creation pages.

- [ ] **Step 4: Update `src/components/profile/profile-content.tsx`**

Replace the file with:

```typescript
"use client";

import { UserCard } from "./cards/user-card";
import { InvoicesCard } from "./cards/invoices-card";
import { ServicesCard } from "./cards/services-card";
import { NotificationsCard } from "./cards/notifications-card";
import { ReservationsCard } from "./cards/reservations-card";
import { ClientKpiBar } from "./client-view/kpi-bar";
import { OwnerUpgradeCta } from "./client-view/owner-upgrade-cta";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";

interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    isSystemAdmin?: boolean;
    createdAt: Date;
}

interface UpcomingReservation {
    id: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

interface ProfileContentProps {
    user: User;
    kpiData: { activeCount: number; completedCount: number; totalSpentCents: number };
    upcomingReservations: UpcomingReservation[];
    showUpgradeCta: boolean;
    isOwnerViewingAsClient: boolean;
}

export function ProfileContent({
    user,
    kpiData,
    upcomingReservations,
    showUpgradeCta,
    isOwnerViewingAsClient,
}: ProfileContentProps) {
    const { t } = useLanguage();
    const userInitial = user.name?.[0]?.toUpperCase() || "?";

    return (
        <div className="mt-10 md:mt-5 lg:mt-0 container mx-auto py-8 md:py-16 lg:py-24 px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col gap-4 md:gap-6">
                {isOwnerViewingAsClient && (
                    <div className="flex justify-end">
                        <Link
                            href="/profile/org"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                            ← {t.clientView.backToOrg}
                        </Link>
                    </div>
                )}

                <UserCard user={user} userInitial={userInitial} />

                <ClientKpiBar
                    activeCount={kpiData.activeCount}
                    completedCount={kpiData.completedCount}
                    totalSpentCents={kpiData.totalSpentCents}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <InvoicesCard />
                    <ServicesCard />
                    <NotificationsCard />
                    <ReservationsCard />
                </div>

                {showUpgradeCta && <OwnerUpgradeCta />}
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /home/jose/qb/qb-auth
npx tsc --noEmit
```

Fix any type errors before proceeding.

- [ ] **Step 6: Manual verification**

Start dev server:
```bash
npm run dev
```

1. Visit `http://localhost:3000/profile` as a client user → should see KPI bar above cards, OwnerUpgradeCta at bottom
2. Visit as a user who is an org owner → should redirect to `/profile/org` (404 for now, expected)
3. Visit `/profile?view=client` as org owner → should show client view with "Back to my organization" link

- [ ] **Step 7: Commit**

```bash
git add src/app/\(user\)/profile/page.tsx src/components/profile/profile-content.tsx src/components/profile/client-view/
git commit -m "feat: add redirect logic and client KPI bar to profile page"
```

---

### Task 5: `/profile/org` page + org view components

**Files:**
- Create: `src/app/(user)/profile/org/page.tsx`
- Create: `src/components/profile/org-view/index.tsx`
- Create: `src/components/profile/org-view/org-header.tsx`
- Create: `src/components/profile/org-view/kpi-bar.tsx`
- Create: `src/components/profile/org-view/properties-card.tsx`
- Create: `src/components/profile/org-view/recent-reservations-card.tsx`
- Create: `src/components/profile/org-view/team-card.tsx`
- Create: `src/components/profile/org-view/finances-card.tsx`

**Interfaces:**
- Consumes: `resolveProfileRole()`, `fetchOrgProperties()`, `fetchOrgReservations()`, `fetchOrgPayouts()` from prior tasks
- Consumes: `getCurrentUser()` from `@/server/auth.server`
- Produces: `/profile/org` route accessible only by org-full/org-restricted users

- [ ] **Step 1: Create `src/app/(user)/profile/org/page.tsx`**

```typescript
import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import {
    fetchOrgProperties,
    fetchOrgReservations,
    fetchOrgPayouts,
} from "../_actions";
import { OrgProfileView } from "@/components/profile/org-view";
import type { Member, Organization } from "@/components/full-user-provider";

export default async function OrgProfilePage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    const userWithMembers = user as typeof user & { members?: Member[] };
    const members: Member[] = userWithMembers.members ?? [];

    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
        members: members.map((m) => ({ role: m.role, organizationId: m.organizationId })),
    });

    if (role === 'admin') redirect('/dashboard');
    if (role === 'client') redirect('/profile');

    const activeMember = members[0];
    const org: Organization = activeMember.organization;

    // Start of current month for KPI filtering
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch org data in parallel
    const [propertiesResult, payoutsResult] = await Promise.all([
        fetchOrgProperties(activeMember.organizationId),
        fetchOrgPayouts(user.id, monthStart),
    ]);

    const properties = propertiesResult.data ?? [];
    const propertyIds = properties.map((p) => p.id);

    const reservationsResult = await fetchOrgReservations(propertyIds, monthStart);
    const reservations = reservationsResult.data ?? [];

    const payouts = payoutsResult.data ?? [];

    const activePropertyCount = properties.filter((p) => p.isLive).length;
    const monthlyBookingCount = reservations.length;
    const monthlyIncomeCents = payouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);
    const avgRating =
        properties.length > 0
            ? properties.reduce((sum, p) => sum + (p.avgRating ?? 0), 0) / properties.length
            : null;

    const recentReservations = [...reservations]
        .sort((a, b) => new Date(b.createdAt ?? b.checkIn).getTime() - new Date(a.createdAt ?? a.checkIn).getTime())
        .slice(0, 5);

    const isFullAccess = role === 'org-full';
    const orgMemberRole = activeMember.role;

    return (
        <OrgProfileView
            user={{ id: user.id, name: user.name, email: user.email, image: user.image ?? null }}
            org={org}
            orgMemberRole={orgMemberRole}
            isFullAccess={isFullAccess}
            kpi={{
                activePropertyCount,
                monthlyBookingCount,
                monthlyIncomeCents,
                avgRating,
            }}
            properties={properties}
            recentReservations={recentReservations}
            allMembers={members}
            payouts={payouts}
        />
    );
}
```

- [ ] **Step 2: Create `src/components/profile/org-view/org-header.tsx`**

```typescript
"use client";

import { Avatar, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";

interface OrgHeaderProps {
    orgName: string;
    orgLogo: string | null;
    orgSlug: string;
    memberRole: string;
    userName: string;
    userImage: string | null;
}

const ROLE_BADGE: Record<string, { labelKey: keyof typeof import("@/i18n/translations").translations.en.orgView; color: "default" | "primary" | "secondary" | "success" | "warning" | "danger" }> = {
    owner: { labelKey: 'roleOwner', color: 'primary' },
    admin: { labelKey: 'roleAdmin', color: 'secondary' },
    staff: { labelKey: 'roleStaff', color: 'default' },
    agent: { labelKey: 'roleAgent', color: 'warning' },
};

export function OrgHeader({ orgName, orgLogo, orgSlug, memberRole, userName, userImage }: OrgHeaderProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const badge = ROLE_BADGE[memberRole] ?? ROLE_BADGE['agent'];

    return (
        <div className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm p-4 md:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Avatar
                        src={orgLogo ?? undefined}
                        name={orgName[0]?.toUpperCase()}
                        className="w-14 h-14 text-lg border-4 border-blue-100 dark:border-slate-700"
                        color="primary"
                        imgProps={{ referrerPolicy: "no-referrer" }}
                    />
                    <div>
                        <h2 className="text-xl font-bold text-black dark:text-white">{orgName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">@{orgSlug}</span>
                            <Chip size="sm" radius="sm" variant="flat" color={badge.color}>
                                {t.orgView[badge.labelKey]}
                            </Chip>
                        </div>
                    </div>
                </div>
                <Button
                    variant="bordered"
                    size="sm"
                    className="font-medium border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35"
                    startContent={<Icons.person className="size-4" />}
                    onPress={() => router.push('/profile?view=client')}
                >
                    {t.orgView.viewAsClient}
                </Button>
            </div>
        </div>
    );
}
```

> **Note on icons:** Replace `Icons.person` with an existing icon from `src/components/icons/iconify.tsx`. Check for `Icons.user`, `Icons.account`, or similar.

- [ ] **Step 3: Create `src/components/profile/org-view/kpi-bar.tsx`**

```typescript
"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import { Icons } from "@/components/icons/iconify";

interface OrgKpiBarProps {
    activePropertyCount: number;
    monthlyBookingCount: number;
    monthlyIncomeCents: number;
    avgRating: number | null;
    showFinancials: boolean;
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-sm px-4 py-3 shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-800">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-sm shrink-0">{icon}</div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-lg font-bold text-black dark:text-white">{value}</p>
            </div>
        </div>
    );
}

export function OrgKpiBar({ activePropertyCount, monthlyBookingCount, monthlyIncomeCents, avgRating, showFinancials }: OrgKpiBarProps) {
    const { t } = useLanguage();
    const income = (monthlyIncomeCents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    const rating = avgRating != null ? avgRating.toFixed(1) : '—';

    return (
        <div className={`grid gap-3 ${showFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <KpiCard
                icon={<Icons.building className="size-4 text-blue-600 dark:text-blue-400" />}
                label={t.orgView.activeProperties}
                value={String(activePropertyCount)}
            />
            <KpiCard
                icon={<Icons.reservation className="size-4 text-green-600 dark:text-green-400" />}
                label={t.orgView.monthlyBookings}
                value={String(monthlyBookingCount)}
            />
            {showFinancials && (
                <KpiCard
                    icon={<Icons.invoice className="size-4 text-purple-600 dark:text-purple-400" />}
                    label={t.orgView.monthlyIncome}
                    value={income}
                />
            )}
            <KpiCard
                icon={<Icons.star className="size-4 text-yellow-500" />}
                label={t.orgView.avgRating}
                value={rating}
            />
        </div>
    );
}
```

> **Note on icons:** Check `src/components/icons/iconify.tsx` for available icon names. Replace `Icons.star`, `Icons.invoice` with whatever exists. Common names: `Icons.starBold`, `Icons.moneyBag`, etc.

- [ ] **Step 4: Create `src/components/profile/org-view/properties-card.tsx`**

```typescript
"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useLanguage } from "@/i18n/LanguageContext";
import type { BackendProperty } from "@/app/(user)/profile/_actions";

interface PropertiesCardProps {
    properties: BackendProperty[];
    panelUrl: string;
}

export function PropertiesCard({ properties, panelUrl }: PropertiesCardProps) {
    const { t } = useLanguage();

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-sm">
                        <Icons.building className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white">{t.orgView.properties}</h3>
                </div>
                <Button
                    as="a"
                    href={panelUrl}
                    target="_blank"
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-300 font-medium"
                >
                    {t.orgView.managePanelLink}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                {properties.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t.orgView.noProperties}</p>
                ) : (
                    <div className="space-y-3">
                        {properties.map((property) => (
                            <div
                                key={property.id}
                                className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-black dark:text-white truncate">{property.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {property.avgRating != null ? `★ ${property.avgRating.toFixed(1)}` : '—'} · {property.reviewCount} reviews
                                    </p>
                                </div>
                                <Chip
                                    size="sm"
                                    radius="sm"
                                    variant="flat"
                                    color={property.isLive ? 'success' : 'warning'}
                                >
                                    {property.isLive ? 'Live' : 'Draft'}
                                </Chip>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
```

- [ ] **Step 5: Create `src/components/profile/org-view/recent-reservations-card.tsx`**

```typescript
"use client";

import { Card, CardBody, CardHeader, Button, Chip, Divider } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import type { BackendReservation } from "@/app/(user)/profile/_actions";

interface RecentReservationsCardProps {
    reservations: BackendReservation[];
}

function getStatusColor(status: string): "success" | "warning" | "danger" | "default" {
    if (status === 'CONFIRMED' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') return 'success';
    if (status === 'PENDING') return 'warning';
    if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger';
    return 'default';
}

export function RecentReservationsCard({ reservations }: RecentReservationsCardProps) {
    const { t } = useLanguage();
    const router = useRouter();

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-sm">
                        <Icons.reservation className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white">{t.orgView.recentReservations}</h3>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium" onPress={() => router.push('/profile/reservations')}>
                    {t.cards.viewAll}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                {reservations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t.orgView.noRecentReservations}</p>
                ) : (
                    <div className="space-y-3">
                        {reservations.map((res) => (
                            <div key={res.id} className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-black dark:text-white text-sm truncate">
                                            {res.customerAuthUserId}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{res.checkIn} → {res.checkOut}</p>
                                    </div>
                                    <Chip size="sm" radius="sm" variant="flat" color={getStatusColor(res.status)}>
                                        {res.status}
                                    </Chip>
                                </div>
                                <Divider className="my-2 bg-gray-200 dark:bg-slate-700" />
                                <p className="text-right font-bold text-blue-600 dark:text-blue-300 text-sm">
                                    {(res.totalPrice / 100).toLocaleString('es-ES', { style: 'currency', currency: res.currency || 'EUR' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
```

- [ ] **Step 6: Create `src/components/profile/org-view/team-card.tsx`** (owner/admin only)

```typescript
"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Member } from "@/components/full-user-provider";

interface TeamCardProps {
    members: Member[];
}

const ROLE_COLORS: Record<string, "default" | "primary" | "secondary" | "warning"> = {
    owner: 'primary',
    admin: 'secondary',
    staff: 'default',
    agent: 'warning',
};

export function TeamCard({ members }: TeamCardProps) {
    const { t } = useLanguage();
    const router = useRouter();

    const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
        acc[m.role] = (acc[m.role] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-sm">
                        <Icons.people className="size-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t.orgView.team}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} members</p>
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium" onPress={() => router.push('/organizations')}>
                    {t.cards.viewAll}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(roleCounts).map(([role, count]) => (
                        <div key={role} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                            <Chip size="sm" radius="sm" variant="flat" color={ROLE_COLORS[role] ?? 'default'}>{role}</Chip>
                            <span className="text-sm font-semibold text-black dark:text-white">{count}</span>
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}
```

> **Note on icons:** Replace `Icons.people` with an existing icon. Check `src/components/icons/iconify.tsx` for group/team icon names.

- [ ] **Step 7: Create `src/components/profile/org-view/finances-card.tsx`** (owner/admin only)

```typescript
"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import type { BackendPayout } from "@/app/(user)/profile/_actions";

interface FinancesCardProps {
    payouts: BackendPayout[];
    monthlyIncomeCents: number;
}

export function FinancesCard({ payouts, monthlyIncomeCents }: FinancesCardProps) {
    const { t } = useLanguage();
    const router = useRouter();

    const pendingPayouts = payouts.filter((p) => p.status === 'PENDING');
    const pendingAmountCents = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
    const currency = payouts[0]?.currency ?? 'EUR';

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString('es-ES', { style: 'currency', currency });

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-sm">
                        <Icons.invoice className="size-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white">{t.orgView.finances}</h3>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium" onPress={() => router.push('/profile/invoices')}>
                    {t.cards.viewAll}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5 space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t.orgView.monthlyIncome}</p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-lg">{fmt(monthlyIncomeCents)}</p>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Cobros pendientes</p>
                    <div className="flex items-center gap-2">
                        <Chip size="sm" radius="sm" variant="flat" color={pendingPayouts.length > 0 ? 'warning' : 'success'}>
                            {pendingPayouts.length}
                        </Chip>
                        <p className="font-bold text-black dark:text-white">{fmt(pendingAmountCents)}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
```

- [ ] **Step 8: Create `src/components/profile/org-view/index.tsx`**

```typescript
"use client";

import { OrgHeader } from "./org-header";
import { OrgKpiBar } from "./kpi-bar";
import { PropertiesCard } from "./properties-card";
import { RecentReservationsCard } from "./recent-reservations-card";
import { TeamCard } from "./team-card";
import { FinancesCard } from "./finances-card";
import type { BackendProperty, BackendReservation, BackendPayout } from "@/app/(user)/profile/_actions";
import type { Member, Organization } from "@/components/full-user-provider";
import { getSystemConfigClient } from "@/lib/system-config-client";

interface OrgProfileViewProps {
    user: { id: string; name: string; email: string; image: string | null };
    org: Organization;
    orgMemberRole: string;
    isFullAccess: boolean;
    kpi: {
        activePropertyCount: number;
        monthlyBookingCount: number;
        monthlyIncomeCents: number;
        avgRating: number | null;
    };
    properties: BackendProperty[];
    recentReservations: BackendReservation[];
    allMembers: Member[];
    payouts: BackendPayout[];
    panelUrl?: string;
}

export function OrgProfileView({
    user,
    org,
    orgMemberRole,
    isFullAccess,
    kpi,
    properties,
    recentReservations,
    allMembers,
    payouts,
    panelUrl = 'https://panel.hostravel.net',
}: OrgProfileViewProps) {
    return (
        <div className="mt-10 md:mt-5 lg:mt-0 container mx-auto py-8 md:py-16 lg:py-24 px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="flex flex-col gap-4 md:gap-6">
                <OrgHeader
                    orgName={org.name}
                    orgLogo={org.logo}
                    orgSlug={org.slug}
                    memberRole={orgMemberRole}
                    userName={user.name}
                    userImage={user.image}
                />

                <OrgKpiBar
                    activePropertyCount={kpi.activePropertyCount}
                    monthlyBookingCount={kpi.monthlyBookingCount}
                    monthlyIncomeCents={kpi.monthlyIncomeCents}
                    avgRating={kpi.avgRating}
                    showFinancials={isFullAccess}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <PropertiesCard properties={properties} panelUrl={panelUrl} />
                    <RecentReservationsCard reservations={recentReservations} />
                    {isFullAccess && <TeamCard members={allMembers} />}
                    {isFullAccess && <FinancesCard payouts={payouts} monthlyIncomeCents={kpi.monthlyIncomeCents} />}
                </div>
            </div>
        </div>
    );
}
```

> **Note on `panelUrl`:** Pass `panelUrl` from page.tsx by calling `getSystemConfig('QB_PANEL_URL')` (already exists in `src/lib/system-config.ts`). Update `page.tsx` to fetch and pass it, or hardcode `'https://panel.hostravel.net'` as fallback.

- [ ] **Step 9: Update `src/app/(user)/profile/org/page.tsx` to fetch panelUrl**

In `OrgProfilePage`, add before the return statement:

```typescript
const panelUrl = await getSystemConfig('QB_PANEL_URL') ?? 'https://panel.hostravel.net';
```

Import: `import { getSystemConfig } from "@/lib/system-config";`

Pass `panelUrl` to `OrgProfileView`.

- [ ] **Step 10: Verify TypeScript**

```bash
cd /home/jose/qb/qb-auth
npx tsc --noEmit
```

Fix all type errors.

- [ ] **Step 11: Manual verification**

1. Log in as a user who is an org member and has an Owner record in qb-back
2. Visit `http://localhost:3000/profile` → should redirect to `/profile/org`
3. `/profile/org` should show org header with "Ver como cliente" button, KPI bar, properties card, recent reservations card
4. If `isFullAccess`, team card and finances card should also appear
5. Click "Ver como cliente" → should go to `/profile?view=client` and show client view with "Back to my organization" link
6. Log in as a user with no org → `/profile` shows client view with upgrade CTA at bottom

- [ ] **Step 12: Commit**

```bash
git add src/app/\(user\)/profile/org/ src/components/profile/org-view/
git commit -m "feat: add org profile page and org view components"
```

---

### Task 6: Admin KPI bar for `/dashboard`

**Files:**
- Create: `src/components/profile/admin-view/platform-kpi-bar.tsx`
- Modify: `src/app/(user)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `fetchPlatformPropertyCount()`, `fetchPlatformReservationCount()` from `_actions.ts`
- Consumes: `prisma.user.count()`, `prisma.organization.count()` (direct Prisma in page.tsx)
- Produces: `PlatformKpiBar` component accepting `{ activePropertyCount, weeklyReservationCount, newUserCount, activeOrgCount }`

- [ ] **Step 1: Create `src/components/profile/admin-view/platform-kpi-bar.tsx`**

```typescript
"use client";

import { useLanguage } from "@/i18n/LanguageContext";
import { Icons } from "@/components/icons/iconify";

interface PlatformKpiBarProps {
    activePropertyCount: number;
    weeklyReservationCount: number;
    newUserCount: number;
    activeOrgCount: number;
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
    return (
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-slate-800">
            <div className={`p-2 ${accent} rounded-sm shrink-0`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-xl font-bold text-black dark:text-white">{value}</p>
            </div>
        </div>
    );
}

export function PlatformKpiBar({ activePropertyCount, weeklyReservationCount, newUserCount, activeOrgCount }: PlatformKpiBarProps) {
    const { t } = useLanguage();
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KpiCard
                icon={<Icons.building className="size-4 text-blue-600 dark:text-blue-400" />}
                accent="bg-blue-50 dark:bg-blue-900/30"
                label={t.adminView.activeProperties}
                value={String(activePropertyCount)}
            />
            <KpiCard
                icon={<Icons.reservation className="size-4 text-green-600 dark:text-green-400" />}
                accent="bg-green-50 dark:bg-green-900/30"
                label={t.adminView.weeklyReservations}
                value={String(weeklyReservationCount)}
            />
            <KpiCard
                icon={<Icons.people className="size-4 text-purple-600 dark:text-purple-400" />}
                accent="bg-purple-50 dark:bg-purple-900/30"
                label={t.adminView.newUsers}
                value={String(newUserCount)}
            />
            <KpiCard
                icon={<Icons.info className="size-4 text-orange-600 dark:text-orange-400" />}
                accent="bg-orange-50 dark:bg-orange-900/30"
                label={t.adminView.activeOrgs}
                value={String(activeOrgCount)}
            />
        </div>
    );
}
```

> **Note on icons:** Replace `Icons.people`, `Icons.info` with icons that exist in `src/components/icons/iconify.tsx`. Scan the file for available names.

- [ ] **Step 2: Update `src/app/(user)/dashboard/page.tsx`**

Replace with:

```typescript
import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { PlatformKpiBar } from "@/components/profile/admin-view/platform-kpi-bar";
import { prisma } from "@/lib/prisma";
import { getAllSystemConfig } from "@/lib/system-config";
import { fetchPlatformPropertyCount, fetchPlatformReservationCount } from "@/app/(user)/profile/_actions";

export default async function DashboardPage() {
    const { data: user } = await getCurrentUser();

    if (!user) {
        redirect("/");
    }

    if (!user.isSystemAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-danger mb-4">Access Denied</h1>
                <p className="text-gray-500">You do not have permission to view this page.</p>
            </div>
        );
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data in parallel
    const [
        initialClientsRaw,
        initialConfig,
        newUserCount,
        activeOrgCount,
        activePropertyCount,
        weeklyReservationCount,
    ] = await Promise.all([
        prisma.clientApp.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                clientId: true,
                name: true,
                description: true,
                allowedCallbackUrls: true,
                allowedDomains: true,
                scopes: true,
                signingKeyVersion: true,
                active: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        getAllSystemConfig(),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.organization.count(),
        fetchPlatformPropertyCount(),
        fetchPlatformReservationCount(weekStart),
    ]);

    const initialClients = initialClientsRaw.map((client) => ({
        ...client,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
    }));

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8">Admin Dashboard</h1>
            <PlatformKpiBar
                activePropertyCount={activePropertyCount}
                weeklyReservationCount={weeklyReservationCount}
                newUserCount={newUserCount}
                activeOrgCount={activeOrgCount}
            />
            <AdminDashboard initialClients={initialClients} initialConfig={initialConfig} />
        </div>
    );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/jose/qb/qb-auth
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 4: Manual verification**

1. Log in as a system admin user
2. Visit `http://localhost:3000/dashboard`
3. Should see 4 KPI cards above the existing tabs (Client Apps, System URLs)
4. KPI values should be real numbers from qb-back and qb-auth DB (0s are OK if no data, not errors)
5. Set `QB_BOOKING_URL = https://hostravel.net` in System URLs tab → save → visit `/profile` and click "Buscar alojamientos" → should navigate to hostravel.net

- [ ] **Step 5: Run all tests**

```bash
cd /home/jose/qb/qb-auth
npm test
```

Expected: `9 passed`

- [ ] **Step 6: Commit**

```bash
git add src/components/profile/admin-view/ src/app/\(user\)/dashboard/page.tsx
git commit -m "feat: add platform KPI bar to admin dashboard"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Client view `/profile` with KPI bar | Task 4 |
| Client view KPI: active/completed stays, total spent | Task 4 |
| Client view cards: upcoming stays, invoices, notifications, reservations | Task 4 (existing cards + new KPI) |
| Owner upgrade CTA for users without org | Task 4 |
| `/profile` redirects org members to `/profile/org` | Task 4 |
| `?view=client` skips redirect | Task 4 |
| Org view `/profile/org` | Task 5 |
| Org header: name, logo, slug, role badge | Task 5 |
| "Ver como cliente" button → `/profile?view=client` | Task 5 |
| Org KPI bar: properties, bookings, income, rating | Task 5 |
| Income KPI hidden for staff/agent | Task 5 (`showFinancials` prop) |
| Properties card | Task 5 |
| Recent reservations card | Task 5 |
| Team card (owner/admin only) | Task 5 |
| Finances card (owner/admin only) | Task 5 |
| Role gate: Owner record in qb-back required | Task 3 (role-resolver) |
| Admin → `isSystemAdmin` gate | Task 3 (role-resolver) |
| Admin KPI bar: properties, reservations, users, orgs | Task 6 |
| System Config editor (QB_BOOKING_URL) | Already exists in admin dashboard System URLs tab |
| QB_BOOKING_URL seed | Task 1 |
| i18n for all new strings (ES+EN) | Task 1 |
