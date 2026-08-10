# "Mi perfil" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move personal-data entry out of qb-auth's "Configuración" page into a dedicated, engaging `/profile/me` ("Mi perfil") page with a hybrid conversational-wizard + editor fill mode and moderate gamification (completeness %, confetti, badge).

**Architecture:** A pure completeness helper drives everything. A client orchestrator renders a conversational **wizard** when the profile is incomplete and a card-based **editor** (with a progress ring) when it is complete. Both write through the existing `authClient.updateUser` + `refreshUser`. A completeness card on the profile dashboard links to `/profile/me`. The old "Datos personales" block is removed from `/profile/config`.

**Tech Stack:** Next.js (App Router), better-auth (`authClient.updateUser` with additional fields `phone`/`nationality`/`address`/`passportId`), HeroUI, existing `useFullUser`/`refreshUser` (`@/components/full-user-provider`), `ProfilePageShell`, `Icons` (`@/components/icons/iconify`). Vitest (node env).

## Global Constraints

- **No new env vars, no backend changes, no new storage.** Reuse `authClient.updateUser`.
- **No profile-photo upload.** Avatar = initials (brand navy `#0A2252`, white text); show `user.image` only if already present (OAuth).
- **Copy is hardcoded Spanish**, matching the sibling file `src/app/(user)/profile/config/_form.tsx` (that file does NOT use i18n). Do not introduce `useLanguage`/next-intl into the new personal-data components.
- **Tests only for pure logic.** The repo's Vitest runs in `environment: 'node'` with no jsdom/@testing-library — do NOT write React-render tests. Components are verified with `npx tsc --noEmit` and a manual dev run.
- **Fields (order):** `name`, `phone`, `nationality`, `address`, `passportId`. `email` is read-only and NOT part of completeness.
- Save calls use the existing cast: `authClient.updateUser({ ... } as Parameters<typeof authClient.updateUser>[0])`.

---

## File Structure

- Create `src/lib/profile-completeness.ts` — pure completeness helper + field metadata (single source of truth for fields/labels).
- Create `src/lib/__tests__/profile-completeness.test.ts` — unit tests.
- Create `src/components/profile/personal/profile-progress-ring.tsx` — presentational ring showing `%`.
- Create `src/components/profile/personal/confetti-burst.tsx` — dependency-free celebration.
- Create `src/components/profile/personal/profile-editor.tsx` — mode A (cards, per-field auto-save).
- Create `src/components/profile/personal/profile-wizard.tsx` — mode B (one question per screen, skip, confetti).
- Create `src/components/profile/personal/mi-perfil-client.tsx` — orchestrator (wizard ↔ editor).
- Create `src/app/(user)/profile/me/page.tsx` — server page.
- Create `src/components/profile/personal/profile-completeness-card.tsx` — dashboard card linking to `/profile/me`.
- Modify `src/components/profile/profile-content.tsx` — render the completeness card.
- Modify `src/app/(user)/profile/config/_form.tsx` — remove the "Datos personales" section, its state, and `handleSaveProfile`.

---

### Task 1: Completeness core + hook (TDD)

**Files:**
- Create: `src/lib/profile-completeness.ts`
- Test: `src/lib/__tests__/profile-completeness.test.ts`

**Interfaces:**
- Produces:
  - `PROFILE_FIELDS: ReadonlyArray<{ key: ProfileFieldKey; label: string; icon: string; question: string; placeholder: string; why?: string }>`
  - `type ProfileFieldKey = 'name' | 'phone' | 'nationality' | 'address' | 'passportId'`
  - `interface ProfileCompleteness { percent: number; filled: ProfileFieldKey[]; missing: ProfileFieldKey[]; isComplete: boolean }`
  - `computeProfileCompleteness(user: Partial<Record<ProfileFieldKey, string | null | undefined>>): ProfileCompleteness`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/profile-completeness.test.ts
import { describe, it, expect } from 'vitest'
import { computeProfileCompleteness, PROFILE_FIELDS } from '../profile-completeness'

describe('computeProfileCompleteness', () => {
	it('is 0% for an empty profile', () => {
		const r = computeProfileCompleteness({})
		expect(r.percent).toBe(0)
		expect(r.isComplete).toBe(false)
		expect(r.missing).toHaveLength(PROFILE_FIELDS.length)
		expect(r.filled).toEqual([])
	})

	it('is 100% and complete when all fields are filled', () => {
		const r = computeProfileCompleteness({
			name: 'Jose', phone: '+34600', nationality: 'ES', address: 'Calle 1', passportId: 'AB1',
		})
		expect(r.percent).toBe(100)
		expect(r.isComplete).toBe(true)
		expect(r.missing).toEqual([])
	})

	it('rounds a partial profile and lists missing keys', () => {
		const r = computeProfileCompleteness({ name: 'Jose', phone: '+34600' })
		expect(r.percent).toBe(40) // 2 of 5
		expect(r.filled).toEqual(['name', 'phone'])
		expect(r.missing).toEqual(['nationality', 'address', 'passportId'])
	})

	it('treats whitespace-only and null as empty', () => {
		const r = computeProfileCompleteness({ name: '   ', phone: null, nationality: undefined })
		expect(r.percent).toBe(0)
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/profile-completeness.test.ts`
Expected: FAIL — cannot find module `../profile-completeness`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/profile-completeness.ts
export type ProfileFieldKey = 'name' | 'phone' | 'nationality' | 'address' | 'passportId'

export const PROFILE_FIELDS: ReadonlyArray<{
	key: ProfileFieldKey
	label: string
	icon: string
	question: string
	placeholder: string
	why?: string
}> = [
	{ key: 'name', label: 'Nombre completo', icon: 'lucide:user', question: '¿Cómo te llamas?', placeholder: 'Nombre y apellidos' },
	{ key: 'phone', label: 'Teléfono', icon: 'lucide:phone', question: '¿Y tu teléfono?', placeholder: '+34 600 000 000' },
	{ key: 'nationality', label: 'Nacionalidad', icon: 'lucide:globe', question: '¿De qué país eres?', placeholder: 'ej. Español', why: 'Agiliza tus futuras reservas y el check-in del hotel.' },
	{ key: 'address', label: 'Dirección', icon: 'lucide:home', question: '¿Cuál es tu dirección?', placeholder: 'Calle, Ciudad, País' },
	{ key: 'passportId', label: 'Pasaporte / DNI', icon: 'lucide:id-card', question: 'Por último, tu documento', placeholder: 'AB123456', why: 'El hotel lo necesita para el registro de entrada.' },
]

export interface ProfileCompleteness {
	percent: number
	filled: ProfileFieldKey[]
	missing: ProfileFieldKey[]
	isComplete: boolean
}

export function computeProfileCompleteness(
	user: Partial<Record<ProfileFieldKey, string | null | undefined>>,
): ProfileCompleteness {
	const filled: ProfileFieldKey[] = []
	const missing: ProfileFieldKey[] = []
	for (const f of PROFILE_FIELDS) {
		const v = (user[f.key] ?? '').toString().trim()
		if (v !== '') filled.push(f.key)
		else missing.push(f.key)
	}
	const percent = Math.round((filled.length / PROFILE_FIELDS.length) * 100)
	return { percent, filled, missing, isComplete: missing.length === 0 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/profile-completeness.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-completeness.ts src/lib/__tests__/profile-completeness.test.ts
git commit -m "feat(profile): profile completeness helper + field metadata"
```

---

### Task 2: Progress ring + confetti (presentational)

**Files:**
- Create: `src/components/profile/personal/profile-progress-ring.tsx`
- Create: `src/components/profile/personal/confetti-burst.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ProfileProgressRing({ percent, size?, children? }: { percent: number; size?: number; children?: React.ReactNode })`
  - `ConfettiBurst({ fire }: { fire: boolean })`

- [ ] **Step 1: Create the progress ring**

```tsx
// src/components/profile/personal/profile-progress-ring.tsx
"use client";

export function ProfileProgressRing({
    percent,
    size = 64,
    children,
}: {
    percent: number;
    size?: number;
    children?: React.ReactNode;
}) {
    const clamped = Math.max(0, Math.min(100, percent));
    return (
        <div
            className="relative shrink-0 rounded-full"
            style={{
                width: size,
                height: size,
                background: `conic-gradient(#7c3aed ${clamped * 3.6}deg, rgb(229 231 235) 0deg)`,
            }}
            role="img"
            aria-label={`Perfil ${clamped}% completo`}
        >
            <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-white dark:bg-slate-900">
                {children ?? (
                    <span className="text-xs font-bold text-[#4c1d95] dark:text-purple-300">{clamped}%</span>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create the dependency-free confetti**

```tsx
// src/components/profile/personal/confetti-burst.tsx
"use client";

import { useEffect, useState } from "react";

const COLORS = ["#7c3aed", "#c026d3", "#f59e0b", "#10b981", "#3b82f6"];

// Lightweight celebration — no npm dependency. Renders ~28 falling pieces once
// `fire` flips to true, then clears itself.
export function ConfettiBurst({ fire }: { fire: boolean }) {
    const [pieces, setPieces] = useState<number[]>([]);

    useEffect(() => {
        if (!fire) return;
        setPieces(Array.from({ length: 28 }, (_, i) => i));
        const t = setTimeout(() => setPieces([]), 1800);
        return () => clearTimeout(t);
    }, [fire]);

    if (pieces.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
            <style>{`
                @keyframes qb-confetti-fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
            {pieces.map((i) => {
                const left = (i * 37) % 100;
                const delay = (i % 7) * 60;
                const dur = 1200 + (i % 5) * 160;
                return (
                    <span
                        key={i}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: `${left}%`,
                            width: 8,
                            height: 12,
                            background: COLORS[i % COLORS.length],
                            borderRadius: 2,
                            animation: `qb-confetti-fall ${dur}ms ${delay}ms ease-in forwards`,
                        }}
                    />
                );
            })}
        </div>
    );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in the two new files (pre-existing `.next/dev/*` generated-file errors, if any, are unrelated).

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/personal/profile-progress-ring.tsx src/components/profile/personal/confetti-burst.tsx
git commit -m "feat(profile): progress ring + dependency-free confetti"
```

---

### Task 3: Profile editor (mode A — cards, per-field auto-save)

**Files:**
- Create: `src/components/profile/personal/profile-editor.tsx`

**Interfaces:**
- Consumes: `PROFILE_FIELDS`, `ProfileFieldKey`, `computeProfileCompleteness` (Task 1); `ProfileProgressRing` (Task 2); `useFullUser` (`@/components/full-user-provider`); `authClient` (`@/lib/auth-client`).
- Produces: `ProfileEditor()` — self-contained; reads user from `useFullUser`, saves per field.

- [ ] **Step 1: Create the editor**

```tsx
// src/components/profile/personal/profile-editor.tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useFullUser } from "@/components/full-user-provider";
import { authClient } from "@/lib/auth-client";
import {
    PROFILE_FIELDS,
    type ProfileFieldKey,
    computeProfileCompleteness,
} from "@/lib/profile-completeness";
import { ProfileProgressRing } from "./profile-progress-ring";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileEditor() {
    const { user, refreshUser } = useFullUser();

    const [values, setValues] = useState<Record<ProfileFieldKey, string>>({
        name: user?.name ?? "",
        phone: user?.phone ?? "",
        nationality: user?.nationality ?? "",
        address: user?.address ?? "",
        passportId: user?.passportId ?? "",
    });
    const [fieldState, setFieldState] = useState<Record<string, SaveState>>({});

    const completeness = useMemo(() => computeProfileCompleteness(values), [values]);

    async function saveField(key: ProfileFieldKey) {
        const current = (values[key] ?? "").trim();
        const original = ((user?.[key] as string | null | undefined) ?? "").trim();
        if (current === original) return; // nothing changed
        setFieldState((s) => ({ ...s, [key]: "saving" }));
        const { error } = await authClient.updateUser({
            [key]: current || undefined,
        } as Parameters<typeof authClient.updateUser>[0]);
        if (error) {
            setFieldState((s) => ({ ...s, [key]: "error" }));
        } else {
            setFieldState((s) => ({ ...s, [key]: "saved" }));
            await refreshUser();
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <ProfileProgressRing percent={completeness.percent} />
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {completeness.isComplete ? "Perfil completo" : "Tu perfil"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {completeness.isComplete
                            ? "Todo listo. Los cambios se guardan solos."
                            : `Te faltan ${completeness.missing.length} campos. Se guarda solo al salir de cada campo.`}
                    </p>
                </div>
                {completeness.isComplete && (
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        <Icon icon="lucide:badge-check" className="size-4" aria-hidden />
                        Perfil completo
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Email — read-only, not part of completeness */}
                <Input
                    label="Email"
                    size="sm"
                    value={user?.email ?? ""}
                    isDisabled
                    description="No se puede cambiar el email"
                    classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }}
                />
                {PROFILE_FIELDS.map((f) => {
                    const st = fieldState[f.key];
                    return (
                        <Input
                            key={f.key}
                            label={f.label}
                            size="sm"
                            placeholder={f.placeholder}
                            value={values[f.key]}
                            onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                            onBlur={() => saveField(f.key)}
                            startContent={<Icon icon={f.icon} className="size-4 shrink-0 text-gray-400" aria-hidden />}
                            endContent={
                                st === "saving" ? (
                                    <Icon icon="lucide:loader-2" className="size-4 animate-spin text-gray-400" aria-hidden />
                                ) : st === "saved" ? (
                                    <Icon icon="lucide:check-circle-2" className="size-4 text-green-500" aria-hidden />
                                ) : st === "error" ? (
                                    <Icon icon="lucide:alert-circle" className="size-4 text-red-500" aria-hidden />
                                ) : null
                            }
                            description={st === "error" ? "No se pudo guardar, reintenta." : f.why}
                            classNames={{ inputWrapper: "bg-white dark:bg-slate-900" }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Icons use `@iconify/react`'s `<Icon icon="lucide:…" />`, already a project dependency `@iconify/react@^6` used by other profile components — no Tailwind icon plugin involved.)

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/personal/profile-editor.tsx
git commit -m "feat(profile): personal-data editor with per-field auto-save + ring"
```

---

### Task 4: Profile wizard (mode B — one question per screen)

**Files:**
- Create: `src/components/profile/personal/profile-wizard.tsx`

**Interfaces:**
- Consumes: `PROFILE_FIELDS`, `ProfileFieldKey`, `computeProfileCompleteness` (Task 1); `ConfettiBurst` (Task 2); `useFullUser`, `authClient`.
- Produces: `ProfileWizard({ onFinish }: { onFinish: () => void })` — walks fields, saves each, fires confetti, calls `onFinish` to hand back to the editor.

- [ ] **Step 1: Create the wizard**

```tsx
// src/components/profile/personal/profile-wizard.tsx
"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useFullUser } from "@/components/full-user-provider";
import { authClient } from "@/lib/auth-client";
import { PROFILE_FIELDS, type ProfileFieldKey } from "@/lib/profile-completeness";
import { ConfettiBurst } from "./confetti-burst";

export function ProfileWizard({ onFinish }: { onFinish: () => void }) {
    const { user, refreshUser } = useFullUser();
    const [step, setStep] = useState(0);
    const [value, setValue] = useState<string>(
        (user?.[PROFILE_FIELDS[0].key] as string | null | undefined) ?? "",
    );
    const [saving, setSaving] = useState(false);
    const [celebrate, setCelebrate] = useState(false);

    const field = PROFILE_FIELDS[step];
    const total = PROFILE_FIELDS.length;
    const progress = Math.round((step / total) * 100);

    function loadValueFor(nextStep: number) {
        const key = PROFILE_FIELDS[nextStep]?.key as ProfileFieldKey | undefined;
        setValue(key ? ((user?.[key] as string | null | undefined) ?? "") : "");
    }

    async function advance(save: boolean) {
        if (save) {
            const v = value.trim();
            if (v) {
                setSaving(true);
                await authClient.updateUser({
                    [field.key]: v,
                } as Parameters<typeof authClient.updateUser>[0]);
                await refreshUser();
                setSaving(false);
            }
        }
        const next = step + 1;
        if (next >= total) {
            setCelebrate(true);
            setTimeout(onFinish, 1500);
            return;
        }
        loadValueFor(next);
        setStep(next);
    }

    return (
        <div className="mx-auto max-w-md">
            <ConfettiBurst fire={celebrate} />

            {/* Progress */}
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
                Paso {step + 1} de {total}
            </p>

            <div className="min-h-40 rounded-sm border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center gap-2">
                    <Icon icon={field.icon} className="size-6 text-purple-600 dark:text-purple-400" aria-hidden />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{field.question}</h2>
                </div>
                <Input
                    autoFocus
                    size="lg"
                    placeholder={field.placeholder}
                    value={value}
                    onValueChange={setValue}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") advance(true);
                    }}
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-900" }}
                />
                {field.why && (
                    <p className="mt-2 text-xs text-gray-400">{field.why}</p>
                )}
            </div>

            <div className="mt-4 flex items-center justify-between">
                <Button variant="light" size="sm" onPress={() => advance(false)} isDisabled={saving}>
                    Saltar
                </Button>
                <Button
                    className="bg-purple-600 font-semibold text-white"
                    size="md"
                    onPress={() => advance(true)}
                    isLoading={saving}
                >
                    {step + 1 >= total ? "Terminar" : "Siguiente →"}
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (same icon caveat as Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/personal/profile-wizard.tsx
git commit -m "feat(profile): conversational personal-data wizard with skip + confetti"
```

---

### Task 5: Orchestrator + `/profile/me` page

**Files:**
- Create: `src/components/profile/personal/mi-perfil-client.tsx`
- Create: `src/app/(user)/profile/me/page.tsx`

**Interfaces:**
- Consumes: `ProfileWizard` (Task 4), `ProfileEditor` (Task 3), `computeProfileCompleteness` (Task 1), `useFullUser`, `ProfilePageShell` (`@/components/profile/profile-page-shell`), `Icons` (`@/components/icons/iconify`), `getCurrentUser` (`@/server/auth.server`).
- Produces: `MiPerfilClient()`; default-exported server page at `/profile/me`.

- [ ] **Step 1: Create the orchestrator**

```tsx
// src/components/profile/personal/mi-perfil-client.tsx
"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useFullUser } from "@/components/full-user-provider";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { ProfileWizard } from "./profile-wizard";
import { ProfileEditor } from "./profile-editor";

export function MiPerfilClient() {
    const { user, isLoading } = useFullUser();
    // Start in the wizard when the profile is incomplete; otherwise the editor.
    // A "guided" flag lets the user re-enter the wizard, and the wizard hands
    // back to the editor via onFinish.
    const initialComplete = computeProfileCompleteness(user ?? {}).isComplete;
    const [mode, setMode] = useState<"wizard" | "editor">(initialComplete ? "editor" : "wizard");

    return (
        <ProfilePageShell
            title="Mi perfil"
            backPath="/profile"
            icon={
                <div className="rounded-sm bg-purple-100 p-2 dark:bg-purple-900/40">
                    <Icons.userCircle className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
            }
        >
            {isLoading ? (
                <div className="h-40 animate-pulse rounded-sm bg-gray-100 dark:bg-slate-800" />
            ) : mode === "wizard" ? (
                <ProfileWizard onFinish={() => setMode("editor")} />
            ) : (
                <div className="space-y-4">
                    <ProfileEditor />
                    <Button
                        variant="light"
                        size="sm"
                        startContent={<Icon icon="lucide:wand-2" className="size-4" aria-hidden />}
                        onPress={() => setMode("wizard")}
                    >
                        Rellenar paso a paso
                    </Button>
                </div>
            )}
        </ProfilePageShell>
    );
}
```

- [ ] **Step 2: Create the server page**

```tsx
// src/app/(user)/profile/me/page.tsx
import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { MiPerfilClient } from "@/components/profile/personal/mi-perfil-client";

export default async function MiPerfilPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");
    return <MiPerfilClient />;
}
```

- [ ] **Step 3: Verify `FullUserProvider` wraps this route**

Run: `grep -rn "FullUserProvider" src/app/\(user\)/`
Expected: a layout under `(user)` mounts `<FullUserProvider>` (the same provider `config/_form.tsx` relies on via `useFullUser`). If it is only mounted in a deeper layout that `me/` does not inherit, wrap `<MiPerfilClient/>` is NOT enough — instead confirm `me/page.tsx` sits under the same layout as `config/page.tsx`. Since both live under `src/app/(user)/profile/`, they share `profile`/`(user)` layouts; no extra wiring needed. Document the confirming path in the commit body.

- [ ] **Step 4: Typecheck + manual run**

Run: `npx tsc --noEmit`
Then run the dev server and visit `/profile/me`:
- With an incomplete profile → wizard appears; "Saltar" advances without saving; entering a value + "Siguiente" saves (Network tab shows an `updateUser` call); last step fires confetti then shows the editor.
- With a complete profile → editor appears with a full ring + "Perfil completo" badge; editing a field and blurring shows the saving→saved check.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/personal/mi-perfil-client.tsx "src/app/(user)/profile/me/page.tsx"
git commit -m "feat(profile): /profile/me page with hybrid wizard+editor orchestration"
```

---

### Task 6: Dashboard completeness card + wire into ProfileContent

**Files:**
- Create: `src/components/profile/personal/profile-completeness-card.tsx`
- Modify: `src/components/profile/profile-content.tsx`

**Interfaces:**
- Consumes: `computeProfileCompleteness` (Task 1), `ProfileProgressRing` (Task 2), `useFullUser`, `next/link`.
- Produces: `ProfileCompletenessCard()` — self-contained; hides itself when complete is optional (keep visible with a "completo" state).

- [ ] **Step 1: Create the card**

```tsx
// src/components/profile/personal/profile-completeness-card.tsx
"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useFullUser } from "@/components/full-user-provider";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { ProfileProgressRing } from "./profile-progress-ring";

export function ProfileCompletenessCard() {
    const { user, isLoading } = useFullUser();
    if (isLoading || !user) return null;
    const c = computeProfileCompleteness(user);

    return (
        <Link
            href="/profile/me"
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
        >
            <ProfileProgressRing percent={c.percent} />
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                    {c.isComplete ? "Perfil completo" : `Perfil ${c.percent}% completo`}
                </p>
                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {c.isComplete ? "Ver y editar tus datos" : "Completa tus datos personales"}
                </p>
            </div>
            <Icon icon="lucide:chevron-right" className="size-5 shrink-0 text-gray-400" aria-hidden />
        </Link>
    );
}
```

- [ ] **Step 2: Render it in ProfileContent**

In `src/components/profile/profile-content.tsx`, add the import at the top (after the existing imports):

```tsx
import { ProfileCompletenessCard } from "@/components/profile/personal/profile-completeness-card";
```

Then place the card as the first child inside the outer container. Change:

```tsx
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* User header */}
```

to:

```tsx
    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <ProfileCompletenessCard />
            {/* User header */}
```

- [ ] **Step 3: Typecheck + manual run**

Run: `npx tsc --noEmit`
Then reload `/profile`: the completeness card shows at the top with the ring and links to `/profile/me`.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/personal/profile-completeness-card.tsx src/components/profile/profile-content.tsx
git commit -m "feat(profile): dashboard completeness card linking to /profile/me"
```

---

### Task 7: Remove "Datos personales" from Configuración

**Files:**
- Modify: `src/app/(user)/profile/config/_form.tsx`

**Interfaces:**
- Consumes: nothing new. Deletes the personal-data section so it lives only in `/profile/me`.

- [ ] **Step 1: Delete the personal-data state and handler**

In `src/app/(user)/profile/config/_form.tsx`, remove these state lines (currently near the top of `ConfigForm`):

```tsx
    const [name, setName] = useState(user?.name ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");
    const [nationality, setNationality] = useState(user?.nationality ?? "");
    const [address, setAddress] = useState(user?.address ?? "");
    const [passportId, setPassportId] = useState(user?.passportId ?? "");
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
```

and remove the whole `handleSaveProfile` function:

```tsx
    async function handleSaveProfile() {
        setSavingProfile(true);
        setProfileMsg("");
        const { error } = await authClient.updateUser({
            name,
            phone: phone || undefined,
            nationality: nationality || undefined,
            address: address || undefined,
            passportId: passportId || undefined,
        } as Parameters<typeof authClient.updateUser>[0]);
        if (error) {
            setProfileMsg("Error al guardar. Inténtalo de nuevo.");
        } else {
            setProfileMsg("Datos guardados correctamente.");
            await refreshUser();
        }
        setSavingProfile(false);
    }
```

- [ ] **Step 2: Delete the "Datos personales" SectionCard**

Remove the entire block that begins with `{/* Datos personales */}` and its `<SectionCard ... title="Datos personales">...</SectionCard>` (the grid of `Input`s for name/email/phone/nationality/address/passportId plus the "Guardar cambios" button). Leave the "Métodos de pago", "Seguridad", "Notificaciones", and admin sections untouched.

- [ ] **Step 3: Add a pointer to Mi perfil where the section was**

Insert, in place of the removed section (as the first child of the `space-y-5` container):

```tsx
                {/* Datos personales moved to /profile/me */}
                <Link
                    href="/profile/me"
                    className="flex items-center gap-3 rounded-sm border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800"
                >
                    <Icons.userCircle className="size-5 text-purple-600 dark:text-purple-400" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Tus datos personales</p>
                        <p className="text-xs text-gray-400">Edítalos en Mi perfil</p>
                    </div>
                    <Icons.chevronRight className="size-5 text-gray-400" aria-hidden />
                </Link>
```

Add `import Link from "next/link";` at the top if it is not already imported. If, after removing `handleSaveProfile`, the imports `useState` or `authClient` become unused, leave them only if still used by the password/other sections; otherwise remove the now-unused ones to keep the file clean (the password section still uses `useState` and `authClient.changePassword`, so both remain).

- [ ] **Step 4: Typecheck + manual run**

Run: `npx tsc --noEmit`
Then visit `/profile/config`: no "Datos personales" form; a small "Tus datos personales → Mi perfil" pointer appears; Seguridad/Notificaciones/Pagos still work.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(user)/profile/config/_form.tsx"
git commit -m "refactor(profile): move personal data out of Configuración to Mi perfil"
```

---

## Self-Review

**Spec coverage:**
- New `/profile/me` "Mi perfil" page → Task 5. ✓
- Split personal data out of Configuración → Task 7. ✓
- Hybrid wizard (incomplete) + editor (complete) → Tasks 3–5. ✓
- `useProfileCompleteness`/completeness helper → Task 1 (exposed as `computeProfileCompleteness`; consumed directly — a thin hook wrapper is unnecessary and was dropped per YAGNI). ✓
- Completeness % / ring / confetti / badge (moderate gamification) → Tasks 2, 3, 4, 6. ✓
- Dashboard progress card linking to Mi perfil → Task 6. ✓
- Avatar = initials, no upload → covered by reusing existing avatar rendering; `/profile/me` shows no photo control. The plan does NOT add plan-colored ring to the `/profile/me` header avatar (the spec's "color por plan" was about the global header, already shipped) — the page uses `ProfilePageShell`'s icon, and initials appear in the dashboard header untouched. ✓
- `email` read-only, excluded from completeness → Tasks 1 & 3. ✓
- No env/backend/storage; reuse `updateUser`/`refreshUser`/`ProfilePageShell` → all tasks. ✓
- Tests only for pure logic (node env) → Task 1 has tests; component tasks use typecheck + manual. ✓

**Placeholder scan:** No TODO/TBD; every code step contains full code. All icons use `@iconify/react` `<Icon icon="lucide:…" />` (no Tailwind icon plugin, no emoji in UI copy). ✓

**Type consistency:** `ProfileFieldKey`, `PROFILE_FIELDS`, `computeProfileCompleteness`, `ProfileProgressRing({percent})`, `ConfettiBurst({fire})`, `ProfileWizard({onFinish})`, `ProfileEditor()`, `ProfileCompletenessCard()`, `MiPerfilClient()` are used consistently across tasks. ✓
