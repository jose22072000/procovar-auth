# i18n con next-intl — Tanda 0 (cimientos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace qb-auth's homegrown `LanguageContext` with `next-intl`, so the language lives in the `NEXT_LOCALE` cookie and both server and client components can translate.

**Architecture:** Mirror qb-panel exactly: `src/i18n/config.ts` (locales + cookie name), `src/i18n/request.ts` (`getRequestConfig` reads the cookie, loads `messages/<locale>.json`), `src/server/locale.server.ts` (server action that writes the cookie and revalidates), and `createNextIntlPlugin` in `next.config.ts`. `src/i18n/translations.ts` becomes `messages/en.json` + `messages/es.json` with the same 10 namespaces. The 23 files importing `LanguageContext` move to `useTranslations()` with dotted keys.

**Tech Stack:** Next.js 16 (App Router; the middleware file is `src/proxy.ts`), next-intl v4, TypeScript, Vitest (`environment: 'node'`).

## Global Constraints

- **No new env vars.** The user manages all config in Dokploy.
- **`defaultLocale` is `"es"`** — qb-auth's current default. qb-panel uses `"en"`; do NOT copy that.
- **Cookie name is exactly `NEXT_LOCALE`** (next-intl's convention, same as qb-panel).
- **This batch must land atomically.** Half-applied, the app renders with no translation provider and throws at runtime.
- **Do NOT touch the booking language context.** `src/app/(base)/booking/_lib/lang.tsx` is a *separate* provider used by 7 booking components. It is out of scope (batch 4).
- **No UI test framework.** Vitest runs `environment: 'node'` with no jsdom. Write tests ONLY for pure logic. Verify components with `npx tsc --noEmit`, `npm run build`, and a manual click-through.
- Messages contain **zero** `'`, `{` or `}` characters (verified), so no ICU escaping is needed. If you add copy that contains them, escape per ICU rules.

---

## File Structure

**Create**
- `src/i18n/config.ts` — locales, `defaultLocale`, `LOCALE_COOKIE`, `isLocale()`. Shared by server and client.
- `src/i18n/request.ts` — next-intl request config; reads the cookie, loads the messages bundle.
- `src/server/locale.server.ts` — `setLocale()` server action.
- `messages/en.json`, `messages/es.json` — the message bundles.
- `scripts/check-i18n.ts` — CLI: key parity between bundles.
- `src/lib/i18n-keys.ts` — pure `diffMessageKeys()` used by the CLI and its test.
- `src/lib/__tests__/i18n-keys.test.ts` — unit test for the pure function.

**Modify**
- `next.config.ts` — wrap with `createNextIntlPlugin`.
- `src/app/layout.tsx` — `async`, `<html lang={locale}>`, wrap in `NextIntlClientProvider`.
- `src/app/providers.tsx` — remove `LanguageProvider`.
- `src/proxy.ts` — turn `?lang=` into the `NEXT_LOCALE` cookie; widen the matcher without breaking the auth redirect.
- `src/components/layout/navbar/navbarBasic.tsx` — language switcher calls `setLocale`.
- `src/app/(base)/logout/page.tsx` — server component; stop importing `translations` directly.
- The other 21 files importing `LanguageContext` — mechanical codemod.

**Delete**
- `src/i18n/LanguageContext.tsx`
- `src/i18n/translations.ts`

---

### Task 1: Message bundles + key-parity guard (TDD)

The type today is `t: typeof translations.en` behind an `as`, so **TypeScript never catches a key missing from `es`**. next-intl won't either. A test is the only guard.

**Files:**
- Create: `src/lib/i18n-keys.ts`
- Create: `src/lib/__tests__/i18n-keys.test.ts`
- Create: `messages/en.json`, `messages/es.json`
- Create: `src/i18n/config.ts`

**Interfaces:**
- Produces:
  - `flattenKeys(obj: Record<string, unknown>, prefix?: string): string[]`
  - `diffMessageKeys(a: Record<string, unknown>, b: Record<string, unknown>): { missingInB: string[]; missingInA: string[] }`
  - `locales`, `type Locale`, `defaultLocale: Locale`, `LOCALE_COOKIE`, `isLocale(v): v is Locale`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/i18n-keys.test.ts
import { describe, it, expect } from 'vitest'
import { flattenKeys, diffMessageKeys } from '../i18n-keys'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'

describe('flattenKeys', () => {
	it('flattens nested objects to dotted paths', () => {
		expect(flattenKeys({ nav: { about: 'About' }, lang: { en: 'English' } })).toEqual([
			'nav.about',
			'lang.en',
		])
	})

	it('returns an empty list for an empty object', () => {
		expect(flattenKeys({})).toEqual([])
	})
})

describe('diffMessageKeys', () => {
	it('reports keys missing on each side', () => {
		const a = { nav: { about: 'About', contact: 'Contact' } }
		const b = { nav: { about: 'Acerca de' }, extra: { x: 'x' } }
		expect(diffMessageKeys(a, b)).toEqual({
			missingInB: ['nav.contact'],
			missingInA: ['extra.x'],
		})
	})
})

describe('the real message bundles', () => {
	it('es has exactly the same keys as en', () => {
		const { missingInB, missingInA } = diffMessageKeys(
			en as Record<string, unknown>,
			es as Record<string, unknown>,
		)
		expect({ missingInEs: missingInB, missingInEn: missingInA }).toEqual({
			missingInEs: [],
			missingInEn: [],
		})
	})
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/i18n-keys.test.ts`
Expected: FAIL — cannot resolve `../i18n-keys` and `messages/en.json`.

- [ ] **Step 3: Generate the message bundles from the existing translations**

Do NOT retype the 266 lines by hand — you will drop keys. Generate them:

```bash
mkdir -p messages
npx tsx -e '
import { translations } from "/home/jose/qb/qb-auth/src/i18n/translations";
import fs from "fs";
fs.writeFileSync("/home/jose/qb/qb-auth/messages/en.json", JSON.stringify(translations.en, null, 2) + "\n");
fs.writeFileSync("/home/jose/qb/qb-auth/messages/es.json", JSON.stringify(translations.es, null, 2) + "\n");
console.log("en namespaces:", Object.keys(translations.en).join(" "));
console.log("es namespaces:", Object.keys(translations.es).join(" "));
'
```

Expected output lists the same 10 namespaces on both lines:
`nav auth account logout profile cards clientView orgView adminView lang`

- [ ] **Step 3b: Restore the two function-valued messages by hand**

🔴 `translations.ts` holds **two entries that are functions**, and `JSON.stringify` **drops them silently**:
`logout.descriptionSignedIn(userName)` and `cards.showingOf(shown, total)`. Convert them to ICU messages with named parameters.

Add to `messages/en.json`, inside their namespaces:

```json
"logout": {
  "descriptionSignedIn": "You're about to sign out as {userName}. This will end your session on every Divergtech app you're currently signed in to."
},
"cards": {
  "showingOf": "Showing {shown} of {total}"
}
```

Add to `messages/es.json`:

```json
"logout": {
  "descriptionSignedIn": "Vas a cerrar sesión como {userName}. Esto terminará tu sesión en todas las apps de Divergtech en las que estás conectado."
},
"cards": {
  "showingOf": "Mostrando {shown} de {total}"
}
```

(The `'` in "You're" is literal ICU: `'` only escapes when it precedes `{` or `}`.)

Verify both landed:
Run: `grep -c "showingOf\|descriptionSignedIn" messages/en.json messages/es.json`
Expected: `2` for each file.

- [ ] **Step 4: Enable JSON imports in tsconfig if needed**

Run: `grep -n "resolveJsonModule" tsconfig.json`
If it prints nothing, add `"resolveJsonModule": true` inside `compilerOptions`.

- [ ] **Step 5: Write the pure helper**

```ts
// src/lib/i18n-keys.ts

/** Flattens a nested message object into dotted key paths, e.g. `nav.about`. */
export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
	const keys: string[] = []
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			keys.push(...flattenKeys(value as Record<string, unknown>, path))
		} else {
			keys.push(path)
		}
	}
	return keys
}

export interface MessageKeyDiff {
	/** Keys present in `a` but absent from `b`. */
	missingInB: string[]
	/** Keys present in `b` but absent from `a`. */
	missingInA: string[]
}

/**
 * next-intl does not type-check that every locale bundle carries every key, and
 * the old `t: typeof translations.en` cast hid the same gap. This is the guard.
 */
export function diffMessageKeys(
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): MessageKeyDiff {
	const ka = flattenKeys(a)
	const kb = flattenKeys(b)
	const sa = new Set(ka)
	const sb = new Set(kb)
	return {
		missingInB: ka.filter((k) => !sb.has(k)),
		missingInA: kb.filter((k) => !sa.has(k)),
	}
}
```

- [ ] **Step 6: Write the shared i18n config**

```ts
// src/i18n/config.ts
/**
 * Static i18n configuration shared by server and client.
 * Locale is selected by the `NEXT_LOCALE` cookie; defaults to `es`.
 */
export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

/** qb-auth has always defaulted to Spanish; changing it would be a visible regression. */
export const defaultLocale: Locale = 'es'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeLabels: Record<Locale, string> = {
	en: 'English',
	es: 'Español',
}

export function isLocale(value: string | null | undefined): value is Locale {
	return value != null && (locales as readonly string[]).includes(value)
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/i18n-keys.test.ts`
Expected: PASS (4 tests). If `es has exactly the same keys as en` fails, the existing `translations.ts` already had drifted keys — fix `messages/es.json` by adding the missing keys with a real Spanish translation (never an empty string).

- [ ] **Step 8: Commit**

```bash
git add src/lib/i18n-keys.ts src/lib/__tests__/i18n-keys.test.ts messages src/i18n/config.ts tsconfig.json
git commit -m "feat(i18n): message bundles + key-parity guard"
```

---

### Task 2: next-intl request config, server action, and plugin

**Files:**
- Create: `src/i18n/request.ts`
- Create: `src/server/locale.server.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `defaultLocale`, `isLocale`, `LOCALE_COOKIE`, `Locale` from `src/i18n/config.ts` (Task 1).
- Produces: `setLocale(locale: Locale): Promise<void>` — server action; writes the cookie and revalidates the layout.

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl@^4.12.0
```

Run: `node -p "require('next-intl/package.json').version"`
Expected: a `4.x` version.

- [ ] **Step 2: Create the request config**

```ts
// src/i18n/request.ts
/**
 * next-intl request config: reads the locale from the NEXT_LOCALE cookie
 * (set by the `setLocale` server action, or by src/proxy.ts from `?lang=`)
 * and loads the matching messages bundle.
 */
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config'

export default getRequestConfig(async () => {
	const cookieStore = await cookies()
	const raw = cookieStore.get(LOCALE_COOKIE)?.value
	const locale: Locale = isLocale(raw) ? raw : defaultLocale

	const messages = (await import(`../../messages/${locale}.json`)).default

	return { locale, messages }
})
```

- [ ] **Step 3: Create the server action**

```ts
// src/server/locale.server.ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config'

/**
 * Persist the UI language in the `NEXT_LOCALE` cookie and refresh the route so
 * server-rendered text picks up the new bundle. `revalidatePath('/', 'layout')`
 * invalidates the whole tree — that is what qb-panel does too.
 */
export async function setLocale(locale: Locale): Promise<void> {
	if (!isLocale(locale)) return
	const cookieStore = await cookies()
	cookieStore.set(LOCALE_COOKIE, locale, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
	})
	revalidatePath('/', 'layout')
}
```

- [ ] **Step 4: Wire the plugin**

In `next.config.ts`, add the import at the top and wrap the export. The file currently starts with `import type { NextConfig } from "next";` and ends with `export default nextConfig;`.

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
```

and change the final line from:

```ts
export default nextConfig;
```

to:

```ts
export default withNextIntl(nextConfig);
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `src/i18n/request.ts`, `src/server/locale.server.ts` or `next.config.ts`. Pre-existing errors under `.next/dev/*` are generated-file noise; ignore them.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts src/i18n/request.ts src/server/locale.server.ts
git commit -m "feat(i18n): next-intl request config, setLocale action, plugin"
```

---

### Task 3: Root layout provider + drop LanguageProvider

After this task the app renders through next-intl. `LanguageContext` still exists (deleted in Task 7) but nothing provides it, so any file still importing it will throw. That is expected mid-batch; Tasks 5 and 6 clear them.

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/providers.tsx`

**Interfaces:**
- Consumes: `next-intl` plugin wired in Task 2.

- [ ] **Step 1: Make the root layout locale-aware**

`src/app/layout.tsx` currently has a synchronous `RootLayout` and hardcodes `<html lang="en">` even though the app defaults to Spanish. Add these imports:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
```

and replace the component with:

```tsx
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${poppins.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Remove LanguageProvider from providers.tsx**

`src/app/providers.tsx` is a client component. Delete the import line:

```tsx
import { LanguageProvider } from '@/i18n/LanguageContext';
```

and unwrap it, so `<HeroUIProvider>` → `<ToastProvider />` → `<FullUserProvider>` … remains, with `<LanguageProvider>` and its closing tag removed. Keep every other provider and their nesting order.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/app/layout.tsx` or `src/app/providers.tsx`. Errors in the 22 files still importing `LanguageContext` are expected only if they reference the removed provider — they call `useLanguage()`, which still type-checks. They will now throw at runtime until Tasks 5–6 land.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/providers.tsx
git commit -m "feat(i18n): NextIntlClientProvider in root layout, drop LanguageProvider"
```

---

### Task 4: `?lang=` → NEXT_LOCALE cookie in the middleware

`getRequestConfig` cannot read `searchParams`, so `?lang=` must be turned into the cookie before rendering. External consumers (the booking SSO flow and `/logout?lang=`) rely on this parameter.

The middleware file is `src/proxy.ts` (Next 16 name). Its matcher today is only `/profile/:path*` and `/dashboard/:path*`, so `?lang=` on `/` or `/booking` never reaches it. Widening the matcher means the auth-redirect logic must be guarded by `PROTECTED_ROUTES`, or every page would redirect.

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `isLocale`, `LOCALE_COOKIE` from `src/i18n/config.ts` (Task 1).

- [ ] **Step 1: Rewrite src/proxy.ts**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

const BASE_URL = process.env.APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3500';

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile", "/dashboard"];

/** `?lang=en|es` pins the UI language. getRequestConfig cannot see searchParams. */
function applyLangParam(request: NextRequest, response: NextResponse): NextResponse {
    const lang = request.nextUrl.searchParams.get("lang");
    if (!isLocale(lang)) return response;
    if (request.cookies.get(LOCALE_COOKIE)?.value === lang) return response;

    response.cookies.set(LOCALE_COOKIE, lang, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
    return response;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtected = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    // In production, cookies have __Secure- prefix when useSecureCookies is true
    const cookieName = process.env.NODE_ENV === 'production'
        ? "__Secure-qb.session_token"
        : "qb.session_token";

    const sessionCookie = request.cookies.get(cookieName);

    if (isProtected && !sessionCookie) {
        // Get the full URL with search params to save as callback
        const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;

        // Create flow state with the callback URL
        const flowState = JSON.stringify({ origin: callbackUrl, redirectOrigin: true });

        // Redirect to home page with flow state cookie
        const response = NextResponse.redirect(new URL("/", BASE_URL));

        // Set the flow state cookie so we know where to redirect after login
        response.cookies.set("qb.flow_state", flowState, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });

        return applyLangParam(request, response);
    }

    return applyLangParam(request, NextResponse.next());
}

export const config = {
    // Widened from the two protected prefixes so `?lang=` works everywhere.
    // Static assets, API routes and the Next internals are excluded.
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/proxy.ts`.

- [ ] **Step 3: Verify the auth redirect still guards only the protected routes**

Run: `npx next build` is not needed here; instead reason from the code and confirm by reading: `isProtected` is true only for `/profile`, `/profile/...`, `/dashboard`, `/dashboard/...`. Every other path falls through to `NextResponse.next()`.

Then start the dev server (`npm run dev`) and check, logged out:
- `http://localhost:3500/` → 200, no redirect.
- `http://localhost:3500/profile` → redirects to `/`.
- `http://localhost:3500/?lang=en` → response sets a `NEXT_LOCALE=en` cookie (check DevTools → Application → Cookies).

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(i18n): honour ?lang= by setting the NEXT_LOCALE cookie"
```

---

### Task 5: Codemod the 21 straightforward consumers

21 of the 23 files that import `LanguageContext` only destructure `t` and read `t.<ns>.<key>`. `navbarBasic.tsx` (also needs `lang`/`setLang`) and `providers.tsx` (already handled in Task 3) are excluded.

Mapping: `const { t } = useLanguage()` → `const t = useTranslations()`, and `t.nav.about` → `t('nav.about')`. Using the **root** namespace keeps the dotted keys identical to the old object paths, so the transform is purely mechanical.

**Files:**
- Modify (21): `src/components/account-view.tsx`, `src/components/forms/sign-in.tsx`, `src/components/forms/sign-up.tsx`, `src/components/layout/navbar/userNavbarBasic.tsx`, `src/components/profile/admin-view/platform-kpi-bar.tsx`, `src/components/profile/cards/invoices-card.tsx`, `src/components/profile/cards/notifications-card.tsx`, `src/components/profile/cards/owner-invoices-card.tsx`, `src/components/profile/cards/reservations-card.tsx`, `src/components/profile/cards/services-card.tsx`, `src/components/profile/cards/user-card.tsx`, `src/components/profile/client-view/kpi-bar.tsx`, `src/components/profile/client-view/owner-upgrade-cta.tsx`, `src/components/profile/client-view/upcoming-stays-card.tsx`, `src/components/profile/org-view/finances-card.tsx`, `src/components/profile/org-view/index.tsx`, `src/components/profile/org-view/kpi-bar.tsx`, `src/components/profile/org-view/org-header.tsx`, `src/components/profile/org-view/properties-card.tsx`, `src/components/profile/org-view/team-card.tsx`, `src/components/profile/profile-content.tsx`

**Interfaces:**
- Consumes: `NextIntlClientProvider` mounted in Task 3.

- [ ] **Step 1: Write the codemod**

```ts
// scratch script — do not commit. Save as /tmp/i18n-codemod.ts
import fs from "fs";

const FILES = [
  "src/components/account-view.tsx",
  "src/components/forms/sign-in.tsx",
  "src/components/forms/sign-up.tsx",
  "src/components/layout/navbar/userNavbarBasic.tsx",
  "src/components/profile/admin-view/platform-kpi-bar.tsx",
  "src/components/profile/cards/invoices-card.tsx",
  "src/components/profile/cards/notifications-card.tsx",
  "src/components/profile/cards/owner-invoices-card.tsx",
  "src/components/profile/cards/reservations-card.tsx",
  "src/components/profile/cards/services-card.tsx",
  "src/components/profile/cards/user-card.tsx",
  "src/components/profile/client-view/kpi-bar.tsx",
  "src/components/profile/client-view/owner-upgrade-cta.tsx",
  "src/components/profile/client-view/upcoming-stays-card.tsx",
  "src/components/profile/org-view/finances-card.tsx",
  "src/components/profile/org-view/index.tsx",
  "src/components/profile/org-view/kpi-bar.tsx",
  "src/components/profile/org-view/org-header.tsx",
  "src/components/profile/org-view/properties-card.tsx",
  "src/components/profile/org-view/team-card.tsx",
  "src/components/profile/profile-content.tsx",
];

for (const file of FILES) {
  let src = fs.readFileSync(file, "utf8");

  // FIRST: the one parameterised message. `showingOf` was a function in the old
  // object (`t.cards.showingOf(a, b)`); it is now an ICU message with named args.
  // This must run BEFORE the generic rule, which would otherwise produce
  // `t('cards.showingOf')(a, b)` — a runtime "t(...) is not a function".
  src = src.replace(
    /\bt\.cards\.showingOf\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g,
    "t('cards.showingOf', { shown: $1, total: $2 })",
  );

  // t.ns.key -> t('ns.key')   (two segments, the shape used everywhere)
  src = src.replace(/\bt\.([a-zA-Z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)\b/g, "t('$1.$2')");

  // const { t } = useLanguage();  ->  const t = useTranslations();
  src = src.replace(/const\s*\{\s*t\s*\}\s*=\s*useLanguage\(\);?/g, "const t = useTranslations();");

  // import { useLanguage } from "@/i18n/LanguageContext";  ->  next-intl
  src = src.replace(
    /import\s*\{\s*useLanguage\s*\}\s*from\s*["']@\/i18n\/LanguageContext["'];?/g,
    'import { useTranslations } from "next-intl";',
  );

  fs.writeFileSync(file, src);
  console.log("rewrote", file);
}
```

- [ ] **Step 2: Run it**

Run: `npx tsx /tmp/i18n-codemod.ts`
Expected: 21 `rewrote …` lines.

- [ ] **Step 3: Check nothing was missed**

Run: `grep -rn "useLanguage\|t\.[a-z]" src/components --include=*.tsx | grep -v "_lib/lang" | grep -vE "t\.(toFixed|toString|toLocale)"`
Expected: **no output**. Any hit is a pattern the regex missed (three-segment key, `t` renamed, multiline destructure) — fix it by hand.

Also confirm the parameterised message became a call with named args, not a call on a string:
Run: `grep -rn "showingOf" src/components --include=*.tsx`
Expected: 5 lines, every one of the form `t('cards.showingOf', { shown: …, total: … })`. A line reading `t('cards.showingOf')(…)` is broken — the generic rule ran first.

Also confirm the booking context was untouched:
Run: `grep -rl "_lib/lang" src --include=*.tsx | wc -l`
Expected: `7`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in the 21 files. `useTranslations()` returns a callable, so `t('nav.about')` type-checks; a leftover `t.nav.about` would error with "Property 'nav' does not exist".

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "refactor(i18n): move 21 components from LanguageContext to next-intl"
```

---

### Task 6: Language switcher and the logout server page

Two files need more than the codemod. `navbarBasic.tsx:210` destructures `{ lang, setLang, t }`. `app/(base)/logout/page.tsx` is a **server component** that imports `translations` directly and indexes it with a `?lang=` search param.

**Files:**
- Modify: `src/components/layout/navbar/navbarBasic.tsx`
- Modify: `src/app/(base)/logout/page.tsx`

**Interfaces:**
- Consumes: `setLocale` from `src/server/locale.server.ts` (Task 2); `localeLabels`, `type Locale` from `src/i18n/config.ts` (Task 1).

- [ ] **Step 1: Rewire the switcher in navbarBasic.tsx**

Replace the `LanguageContext` import with:

```tsx
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/server/locale.server";
import type { Locale } from "@/i18n/config";
```

Replace line 210:

```tsx
    const { lang, setLang, t } = useLanguage();
```

with:

```tsx
    const t = useTranslations();
    const lang = useLocale() as Locale;
    // Server action: writes the NEXT_LOCALE cookie and revalidates the layout,
    // so server-rendered text switches too.
    const setLang = (l: Locale) => { void setLocale(l); };
```

Then apply the same `t.ns.key` → `t('ns.key')` rewrite inside this file (the codemod in Task 5 skipped it).

- [ ] **Step 2: Convert the logout page to getTranslations**

`src/app/(base)/logout/page.tsx` currently has:

```tsx
import { translations, type Lang } from '@/i18n/translations';
```

Delete that import. Add:

```tsx
import { getTranslations } from 'next-intl/server';
```

Inside the async page component, replace every `translations[lang].<ns>.<key>` lookup with `t('<ns>.<key>')`, obtaining `t` once:

```tsx
const t = await getTranslations();
```

One lookup is **parameterised**. Line 71 currently reads:

```tsx
copy.descriptionSignedIn(userName)
```

`descriptionSignedIn` was a function in the old object and is now an ICU message. Replace it with:

```tsx
t('logout.descriptionSignedIn', { userName })
```

The `?lang=` param is already turned into the `NEXT_LOCALE` cookie by `src/proxy.ts` (Task 4), so `getTranslations()` resolves the right bundle. Remove the now-unused `lang` variable, the `copy` variable, and the `Lang` type import if nothing else uses them.

- [ ] **Step 3: Verify no file imports the old modules**

Run: `grep -rn "i18n/LanguageContext\|i18n/translations" src --include=*.ts --include=*.tsx`
Expected: **no output**.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in either file.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/navbar/navbarBasic.tsx "src/app/(base)/logout/page.tsx"
git commit -m "feat(i18n): language switcher via setLocale, logout page via getTranslations"
```

---

### Task 7: Delete the old system, add the CLI guard, verify the build

**Files:**
- Delete: `src/i18n/LanguageContext.tsx`, `src/i18n/translations.ts`
- Create: `scripts/check-i18n.ts`

**Interfaces:**
- Consumes: `diffMessageKeys` from `src/lib/i18n-keys.ts` (Task 1).

- [ ] **Step 1: Delete the old modules**

```bash
git rm src/i18n/LanguageContext.tsx src/i18n/translations.ts
```

- [ ] **Step 2: Add the CLI guard**

```ts
// scripts/check-i18n.ts
/**
 * Fails when the locale bundles drift apart. Neither TypeScript nor next-intl
 * catches a key that exists in `en` but not in `es`.
 *
 * Run: npx tsx scripts/check-i18n.ts
 */
import fs from 'fs'
import path from 'path'
import { diffMessageKeys } from '../src/lib/i18n-keys'

const root = path.resolve(__dirname, '..')
const read = (locale: string) =>
	JSON.parse(fs.readFileSync(path.join(root, 'messages', `${locale}.json`), 'utf8')) as Record<
		string,
		unknown
	>

const en = read('en')
const es = read('es')
const { missingInB: missingInEs, missingInA: missingInEn } = diffMessageKeys(en, es)

if (missingInEs.length === 0 && missingInEn.length === 0) {
	console.log('i18n OK: en and es have identical keys')
	process.exit(0)
}

if (missingInEs.length) console.error(`Missing in messages/es.json:\n  ${missingInEs.join('\n  ')}`)
if (missingInEn.length) console.error(`Missing in messages/en.json:\n  ${missingInEn.join('\n  ')}`)
process.exit(1)
```

- [ ] **Step 3: Run the guard**

Run: `npx tsx scripts/check-i18n.ts`
Expected: `i18n OK: en and es have identical keys`, exit code 0.

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run src/lib/__tests__/i18n-keys.test.ts`
Expected: PASS.

- [ ] **Step 5: Full build — this is the real gate**

Run: `npm run build`
Expected: build succeeds and the route list still shows `/`, `/profile`, `/profile/me`, `/dashboard`, `/logout`, `/booking`. A missing `NextIntlClientProvider` or a leftover `useLanguage` surfaces here, not in `tsc`.

- [ ] **Step 6: Manual check of the switcher**

Run `npm run dev`, then:
1. Open `/` — text renders in Spanish (`defaultLocale`).
2. Switch the language to English in the navbar. Text changes **without a full reload flash**, and `NEXT_LOCALE=en` appears in DevTools → Application → Cookies.
3. Hard-reload. It stays in English — the server rendered it, so there is no Spanish flash.
4. Open `/?lang=es`. It switches back to Spanish.
5. Open `/logout?lang=en`. The confirmation page renders in English (server component).

- [ ] **Step 7: Commit**

```bash
git add -A src scripts
git commit -m "refactor(i18n): delete LanguageContext, add check-i18n guard"
```

---

## Self-Review

**Spec coverage** — every item of the spec's "Cimientos" list maps to a task:

1. Install next-intl + plugin → Task 2 (Steps 1, 4). ✓
2. `src/i18n/{config,request}.ts`, `src/server/locale.server.ts` → Task 1 (Step 6), Task 2 (Steps 2, 3). ✓
3. `translations.ts` → `messages/{en,es}.json`, all keys preserved → Task 1 (Step 3), guarded by the parity test. ✓
4. `<html lang={locale}>` + `NextIntlClientProvider` → Task 3. ✓
5. `?lang=` → cookie in `src/proxy.ts` → Task 4. ✓
6. Switcher calls `setLocale` → Task 6 (Step 1). ✓
7. Migrate the files using `useLanguage` → Task 5 (21) + Task 6 (`navbarBasic`) + Task 3 (`providers.tsx`) = 23. ✓
8. Delete `LanguageContext.tsx`, unwrap `LanguageProvider` → Task 3 (Step 2) + Task 7 (Step 1). ✓
9. `scripts/check-i18n.ts` → Task 7 (Step 2). ✓

Spec item "list JSX literals not going through `t()`" is **deliberately dropped from the CLI**: it is a heuristic that produces false positives on `className`, `href` and icon names, and batch 0 translates no new copy. The parity check is the part that has teeth. Batches 1–4 add copy and can revisit it. *(Deviation from the spec's §"Red de seguridad" point 2 — flagged, not silently skipped.)*

Spec item "22 server components sin texto visible → no se tocan" needs no task. ✓
Spec item "9 server components con texto → `getTranslations()`" belongs to batches 1–4, except `logout/page.tsx`, pulled into Task 6 because it imports `translations.ts`, which Task 7 deletes. ✓

**Placeholder scan:** no TBD/TODO. Every code step carries complete code. The one judgement call (a codemod regex missing an exotic `t.` shape) has an explicit verification step (Task 5 Step 3) with the exact grep and the expected empty output.

**Type consistency:** `Locale`, `locales`, `defaultLocale`, `LOCALE_COOKIE`, `isLocale`, `localeLabels` (Task 1) are used with those exact names in Tasks 2, 4 and 6. `setLocale(locale: Locale): Promise<void>` (Task 2) is called as `void setLocale(l)` in Task 6. `diffMessageKeys` returns `{ missingInB, missingInA }` (Task 1) and Task 7 destructures exactly those. `flattenKeys` is exported and used only by `diffMessageKeys` and its test. ✓

**Ordering hazard:** Tasks 3–6 leave the app broken at runtime in between (provider gone, consumers not yet migrated). `tsc` stays green throughout, so **`npm run build` in Task 7 Step 5 is the first real gate**. Do not deploy a partial batch.
