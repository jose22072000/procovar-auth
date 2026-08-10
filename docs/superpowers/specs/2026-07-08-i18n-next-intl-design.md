# Diseño — i18n de qb-auth con next-intl

- **Fecha:** 2026-07-08
- **Servicio:** qb-auth (Next.js 16, App Router).
- **Objetivo:** Que **toda** la UI respete el selector ES/EN, con el mismo sistema que el resto del ecosistema (`next-intl`), no con el contexto casero actual.

## Estado medido (no estimado)

- **118** componentes `.tsx`. Solo **31** usan `useLanguage`.
- **87** sin i18n: **56 client components** y **31 server components** (de estos, **9** con texto visible).
- `src/i18n/translations.ts`: 266 líneas, 10 namespaces (`nav, auth, profile, cards, orgView, adminView, clientView, account, logout, lang`).
- `next-intl` **no está instalado**.
- `src/app/layout.tsx` fija `<html lang="en">` a pelo, aunque el idioma por defecto de la app es `es`.
- `LanguageProvider` cuelga de `src/app/providers.tsx`, que es un **client component**.

## El problema de fondo

El idioma vive en `localStorage` (`qb-auth-lang`). **`localStorage` no llega al servidor.** Por eso:

- Un **server component no puede** saber el idioma → los 9 con texto no se pueden traducir con el sistema actual.
- El primer render en servidor siempre usa `initialLang ?? "es"` y el cliente lo corrige en un `useEffect` → **parpadeo** para quien tenga inglés.

## Decisión: adoptar `next-intl`, copiando qb-panel

qb-panel ya resuelve esto. Se replica su montaje, verificado leyendo su código:

- `src/i18n/config.ts` — `locales`, `defaultLocale`, `LOCALE_COOKIE = 'NEXT_LOCALE'`, `isLocale()`.
- `src/i18n/request.ts` — `getRequestConfig` lee la cookie y carga `messages/<locale>.json`.
- `src/server/locale.server.ts` — server action `setLocale(locale)`: escribe la cookie (1 año, `sameSite: lax`) y hace `revalidatePath('/', 'layout')`.
- `next.config.ts` — `createNextIntlPlugin('./src/i18n/request.ts')`.
- `messages/en.json`, `messages/es.json`.

**La cookie es la pieza clave:** funciona en server *y* client components, y elimina el parpadeo porque el servidor ya renderiza en el idioma correcto.

**Diferencia con qb-panel:** allí `defaultLocale` es `en`. Aquí se mantiene **`es`**, que es el comportamiento actual de qb-auth; cambiarlo sería una regresión visible para los usuarios existentes.

## Alcance

### Cimientos (deben aterrizar juntos o la app se rompe)

1. Instalar `next-intl`. Añadir el plugin en `next.config.ts`.
2. Crear `src/i18n/{config,request}.ts` y `src/server/locale.server.ts`.
3. Convertir `src/i18n/translations.ts` (266 líneas, objeto `{ en, es }`) en `messages/en.json` + `messages/es.json`, **conservando los 10 namespaces y todas las claves**.
4. `src/app/layout.tsx`: `<html lang={locale}>` (leído con `getLocale()`) y envolver con `NextIntlClientProvider`.
5. `src/proxy.ts` (middleware): si llega `?lang=en|es` y difiere de la cookie, **fijar la cookie en la respuesta**. Esto preserva el soporte de `?lang=` que hoy usa el flujo de booking; `getRequestConfig` no puede leer `searchParams`.
6. Selector de idioma (`components/layout/navbar/navbarBasic.tsx`) → llama al server action `setLocale`.
7. Migrar los **31** ficheros que usan `useLanguage` a `useTranslations`.
8. **Eliminar** `src/i18n/LanguageContext.tsx` y sacar `LanguageProvider` de `providers.tsx`.

### Los 87 sin i18n

- **56 client components** → `useTranslations('<namespace>')`.
- **9 server components con texto** → `getTranslations()` de `next-intl/server`. Ya no hace falta empujar el texto a los hijos: con la cookie, el servidor sabe el idioma.
  - `app/(base)/booking/page.tsx`, `booking/success/page.tsx`
  - `app/(user)/apikeys/page.tsx`
  - `app/(user)/dashboard/{page,organizations,permissions,settings,users}/page.tsx`
  - `components/ui/Inputs.tsx`
- Los bloques "Acceso denegado" / "Access Denied" repetidos → un componente compartido.
- **22 server components sin texto visible** (layouts, redirects) → no se tocan.

### Traducción real

El texto está hoy mayormente en español. Para cada literal hay que escribir **la pareja `en`/`es`**: el inglés se redacta, no se copia. Incluye los componentes de `profile/personal/*`, que hardcodeé en español a propósito según su propio spec.

## Red de seguridad

`scripts/check-i18n.ts`, ejecutable con `npx tsx`:

1. **Paridad de claves:** `messages/es.json` debe tener **exactamente** el mismo conjunto de claves que `messages/en.json`. Falla listando las que sobran o faltan.
2. **Literales sueltos:** lista componentes con texto visible en JSX que no pasa por `t(...)`.

Sin esto, "traducido" es una opinión. Con esto es un comando que devuelve 0.

Motivo técnico del punto 1: el tipo actual es `t: typeof translations.en` con un `as`, así que **TypeScript no detecta claves ausentes en `es`**. `next-intl` tampoco lo hará en tiempo de compilación sin configuración extra.

## Descomposición

87 ficheros no caben en un plan. Cinco tandas, cada una desplegable por separado. La 0 es atómica.

| # | Zona | Ficheros |
|---|---|---|
| 0 | Cimientos: `next-intl`, `messages/*.json`, layout, middleware, selector, migrar los 31 existentes, borrar `LanguageContext` | ~40 |
| 1 | `components/layout` + `components/forms` (auth) | 8 |
| 2 | `profile` (`components/profile` + `app/(user)/profile`) | 38 |
| 3 | `app/(user)/dashboard` + `components/admin` | 9 |
| 4 | `booking` + `reservations` + sueltos | 12 |

Cada tanda: `npx tsc --noEmit` limpio + `check-i18n` en verde. qb-auth **no tiene framework de test de UI** (vitest en `environment: 'node'`, sin jsdom), así que la verificación es typecheck + script + prueba manual del selector.

## Fuera de alcance

- El `locale` de los correos transaccionales. Queda anotado: una vez exista la cookie `NEXT_LOCALE`, `notifications.ts` puede leerla en servidor y enviar `locale` a QB Notify, que resuelve la plantilla del idioma. **No se hace ahora.**
- Traducir textos de servidor sin UI (logs, errores de API).

## Riesgos

- **Tanda 0 es atómica.** Si se parte, la app queda sin proveedor de traducciones y revienta en tiempo de ejecución. Se despliega entera o nada.
- `revalidatePath('/', 'layout')` en `setLocale` invalida el árbol completo. Es lo que hace qb-panel; aceptado.
- El `?lang=` del flujo de booking depende del middleware. Si se olvida, ese enlace deja de fijar el idioma.
- `messages/*.json` crecerá mucho. Si molesta, se parte por namespace más adelante; no en este trabajo.
