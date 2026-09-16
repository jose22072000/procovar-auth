# CLAUDE.md — procovar-auth

> **OJO: lo que sigue está copiado del `qb-auth` del que salió este repo y habla
> de OTRO sistema.** Este repositorio es `jose22072000/procovar-auth`, el acceso
> único de Procovar (`auth.procovar.cloud`), y tiene cosas que qb-auth no tiene
> —`apk-tokens.ts`, las sucursales cubanas, `seed-procovar`—. Lo de abajo sirve
> como referencia de cómo está montado better-auth, no como descripción de para
> qué se usa aquí. Contrastar siempre con `procovar/CLAUDE.md`, que es el que
> manda.
>
> Dos cosas de abajo que YA NO SON CIERTAS:
>
>  * **Los ids propios ya no son `cuid()`**: desde el 16/09/2026 los nuevos son
>    **UUIDv7** (`src/lib/uuidv7.ts`, enganchado en `advanced.database.generateId`).
>    Los viejos se quedan como están, y conviven sin problema porque todo lo que
>    guarda un id de auth río abajo es `text`.
>  * **Aquí no se despliega por registro de Docker.** Lo hace Dokploy,
>    compilando desde este repo con su `Dockerfile`. Había un flujo de GitHub
>    (`Build And Push Account`) que empujaba a `docker.divergtech.com` —el
>    registro de la otra empresa— y llevaba **fallando en cada push desde el
>    08/09/2026**, mandando un correo cada vez. Se quitó el 16/09/2026: no
>    desplegaba nada de Procovar.

---

## Lo heredado de qb-auth (Identity Hub)

The ecosystem's **Auth Center**. TypeScript + **better-auth** + **Prisma** (its own
`accounts` Postgres). Also drives the checkout / pago / cancel-reservation flows.

## Responsibilities
- Sessions (cookie `qb.session_token`), verified by other services via HMAC round-trip.
- Signs **service JWTs** (RS256) for service-to-service calls; exposes **JWKS** for local
  verification. `purpose` = destination service; `audience` = e.g. `qb-back`.
- Per-client HMAC signing keys derived from `SERVICE_AUTH_SECRET` (`deriveSigningKey(clientId, v)`).
  The qb-auth admin panel is the source of truth for these — drift → "verifySession failed".
- RBAC: resolves the `rbac` claim (org / wildcard / by-property) that qb-back org-scopes on.

## qb-back ids
qb-auth treats qb-back ids as **opaque strings** — its Prisma models store them as
`String`/`Json` (never `BigInt`/`Int`), and the checkout/cancel actions interpolate them
into qb-back URLs as strings. qb-auth's OWN ids (User/Session/Organization) are `cuid()`
strings. So the qb-back bigint→uuid change needs **no qb-auth change**.

## Post-login redirect contract (do not regress)
booking-login → back to the booking step; normal login → `/profile`; external SSO → the
origin platform.

## Build
Prisma + Next/TS. eslint `eslint.config.mjs`. Env/config is owned by Dokploy — never
add/change env vars in-repo.
