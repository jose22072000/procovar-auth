# procovar-auth

Servicio de **identidad central** de procovar (SSO). Solo **usuarios + organizaciones** — sin
lógica de negocio de otros proyectos. Varias apps (PEDIDO, delivery, analitics) se conectan aquí
para no manejar auth cada una por su lado. Incluye **auditoría** (qué hace cada usuario y en qué
client). Construido sobre [better-auth](https://better-auth.com) (Next.js + Prisma/Postgres).

> **Principio:** el manejo de **usuarios y autenticación** vive SOLO aquí. Las apps ya NO tienen
> login ni tabla de usuarios propios: solo consumen este servicio (ver `INTEGRATION.md`).

## Modelo de datos
- `user`, `session`, `account`, `verification` — auth base.
- `organization`, `member`, `invitation` — multi-tenant (una org = una **sucursal** en procovar).
- `role`, `user_role` — RBAC customizable (ver abajo).
- `audit_log` — auditoría (ver abajo).

## Roles y permisos (RBAC) — configurar UNA vez
- Un **rol** = un conjunto de **permisos** (claves `modulo.recurso.accion`, catálogo en
  `src/lib/permissions.ts`: identidad, pedido, delivery, analitics; extensible por cada client app).
- Los roles son **customizables** (crear/editar/borrar desde `/roles`, solo super-admin).
- Un usuario puede tener **VARIOS roles**; sus permisos efectivos = **unión** de todos (así
  "compagina" lo que le falta). Comodín `*` = todo.
- Roles base (seed opcional): `psql "$DATABASE_URL" -f scripts/seed-roles.sql`
  (Super Admin, Administrador, Supervisor, Gestor, Usuario).
- APIs para las apps: `GET /api/me/permissions` (usuario logueado, con la cookie),
  `POST /api/authorize` (servidor-a-servidor con x-api-key: `{userId, permission}` → `{allowed}`),
  `GET /api/permissions` (catálogo). Gestión: `/api/roles`, `/api/users/:id/roles`.

Ganchos multi-app en `src/lib/auth.ts`: `Session.clientId` (qué app), `Session.revokedAt`,
`User.isSystemAdmin`, cookie compartida entre subdominios (`ROOT_DOMAIN`, prefijo `qb`).

## Cómo conecta una app
1. **Sesión compartida**: todas bajo un mismo dominio (`auth.`/`pedido.`/`delivery.`/`analitics.`)
   para compartir la cookie `qb.session_token`. Cada app valida la sesión con
   `GET /api/verify-session` (manda la cookie → recibe `session + user`).
2. **clientId**: al redirigir a auth, la app pasa su `clientId` (flujo `src/lib/flow-state.ts`),
   que queda asociado a la sesión y a la auditoría.

## Auditoría — "qué hacen los usuarios y en qué client"
- **Automática (eventos de auth):** sign-in (éxito/fallo), sign-up, sign-out, password-reset — se
  registran en `src/server/auth.server.ts` con `clientId`, IP y user-agent.
- **Desde las apps:** cada app registra sus propias acciones:
  ```
  POST /api/audit          (header x-api-key: SERVICE_API_KEY)
  { "clientId": "delivery", "action": "order.create", "userId": "...", "resource": "order:123",
    "status": "success", "metadata": { ... } }
  ```
- **Consulta (solo super-admin):** `GET /api/audit?clientId=&userId=&action=&limit=`.

## Puesta en marcha
```bash
npm install
cp .env.example .env         # completa DATABASE_URL, BETTER_AUTH_SECRET, AUTH_FLOW_SECRET, SERVICE_API_KEY…
npx prisma migrate deploy    # incluye 20260707120000_add_audit_log
npx prisma generate
npm run dev                  # http://localhost:3500
```
