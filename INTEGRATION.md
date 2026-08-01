# procovar-auth — Guía de integración para las apps (PEDIDO, delivery, analitics)

Documento autocontenido para conectar cualquier app de procovar al **auth central**
(`procovar-auth`). Cubre: login/sesión (SSO), permisos (RBAC) y auditoría de eventos.
Base URL del servicio: `https://auth.<tu-dominio>` (dev: `http://localhost:3500`).

> ## ⭐ PRINCIPIO (obligatorio)
> **El manejo de USUARIOS y la AUTENTICACIÓN pasan a vivir SOLO en `procovar-auth`.**
> Las apps (PEDIDO, delivery, analitics) **ya NO** crean usuarios, ni tienen login, ni tabla
> de usuarios, ni JWT propio. Solo **consumen** este servicio: validan la sesión (`verify-session`),
> leen permisos (`me/permissions` / `authorize`) y registran auditoría (`/api/audit`).
> Cualquier alta/baja/edición de usuarios, roles y permisos se hace **aquí, una sola vez**.

Cada app se identifica con un **`clientId`**: `pedido` | `delivery` | `analitics` (y los
que se agreguen). Ese clientId etiqueta la sesión y la auditoría (para saber "quién hizo
qué y en qué app").

---

## 1. Sesión / SSO
Todas las apps y auth viven bajo un **mismo dominio raíz** (`auth.`, `pedido.`, `delivery.`,
`analitics.` sobre `<tu-dominio>`) para compartir la cookie `qb.session_token`.

- **Login/registro/logout**: los maneja auth (`/api/auth/*` de better-auth y las pantallas
  `/`, `/sign-up`, `/forgot-password`). Las apps redirigen a auth para autenticar.
- **Validar la sesión** desde una app (server-side): reenvía la cookie a:
  ```
  GET {AUTH_URL}/api/verify-session      (con la cookie del request)
  → 200 { session, user }   |   401 si no hay sesión
  ```

Ejemplo (Node/Express o Next server):
```ts
const res = await fetch(`${AUTH_URL}/api/verify-session`, {
  headers: { cookie: req.headers.cookie ?? "" },
});
if (!res.ok) return unauthorized();
const { user } = await res.json();   // user.id, user.email, user.name, user.isSystemAdmin
```

---

## 2. Permisos (RBAC)
Un usuario tiene **varios roles**; sus permisos efectivos son la **unión** de todos.
Claves de permiso: `modulo.recurso.accion` (catálogo en `GET /api/permissions`).

- **En la app (cliente, con la cookie)** — para pintar/gatear la UI del usuario logueado:
  ```
  GET {AUTH_URL}/api/me/permissions
  → { user, isSystemAdmin, roles[], permissions: ["pedido.orders.read", ...] }
  ```
- **Servidor-a-servidor** (con `x-api-key: SERVICE_API_KEY`) — para autorizar en el backend:
  ```
  POST {AUTH_URL}/api/authorize
  body: { "userId": "...", "permission": "delivery.routes.manage", "organizationId": "opcional" }
  → { allowed: true|false, permissions: [...] }
  ```

Convención sugerida por app (claves ya en el catálogo):
- PEDIDO: `pedido.orders.read`, `pedido.orders.write`, `pedido.import`, `pedido.reports`
- Delivery: `delivery.orders.read`, `delivery.routes.manage`, `delivery.vehicles.manage`, `delivery.branches.manage`, `delivery.settings.manage`
- Analitics: `analitics.view`, `analitics.export`, `analitics.config`

Para agregar permisos de una **nueva app**: añade un grupo en `src/lib/permissions.ts`.

---

## 3. Auditoría de eventos (qué hizo cada quién, en qué app, por día)
Cada app registra sus acciones llamando (con `x-api-key`):
```
POST {AUTH_URL}/api/audit
body: {
  "clientId": "delivery",              // qué app
  "action":   "order.create",          // qué hizo
  "userId":   "ckxyz...",              // quién (del verify-session)
  "resource": "order:123",             // opcional
  "status":   "success",               // success | failure
  "metadata": { ... }                   // libre
}
```
- Se guarda en Postgres (histórico permanente, consultable por día) y se publica en **Redis**
  (stream `audit:day:YYYY-MM-DD` + canal `audit:events` para tiempo real).
- El super-admin lo ve en `/audit` (filtros por client, acción y **día**) y en vivo por
  `GET /api/audit/stream` (SSE). Consulta por API: `GET /api/audit?clientId=&action=&day=YYYY-MM-DD`.
- Los eventos de auth (sign-in/out, sign-up, reset) se auditan solos en el servicio.

---

## 4. Variables de entorno en cada app conectada
```
AUTH_URL=https://auth.<tu-dominio>          # base del servicio de auth
SERVICE_API_KEY=<la MISMA que en auth>      # x-api-key para /api/audit y /api/authorize
APP_CLIENT_ID=pedido|delivery|analitics     # el clientId de esta app
```

## 5. Checklist para integrar una app
1. Desplegar la app bajo un subdominio del mismo dominio raíz que auth (cookie compartida).
2. Middleware/guard: validar con `GET /api/verify-session`; si 401 → redirigir a `AUTH_URL`.
3. Cargar permisos con `GET /api/me/permissions` (UI) y/o `POST /api/authorize` (backend).
4. Registrar acciones relevantes con `POST /api/audit` (clientId = APP_CLIENT_ID).
5. Quitar el login/tabla de usuarios propios de la app (la identidad es central).

## Endpoints (resumen)
| Método | Ruta | Auth | Para |
|---|---|---|---|
| GET | `/api/verify-session` | cookie | validar sesión |
| GET | `/api/me/permissions` | cookie | permisos del usuario logueado |
| GET | `/api/user/full-profile` | cookie | perfil + orgs/roles |
| POST | `/api/authorize` | x-api-key | ¿usuario puede permiso? (backend) |
| GET | `/api/permissions` | cookie | catálogo de permisos |
| GET/POST | `/api/roles` | cookie (roles.manage) | listar/crear roles |
| PATCH/DELETE | `/api/roles/:id` | cookie (roles.manage) | editar/borrar rol |
| GET/POST/DELETE | `/api/users/:id/roles` | cookie (roles.manage) | roles de un usuario |
| POST | `/api/audit` | x-api-key | registrar acción |
| GET | `/api/audit` | cookie (super-admin) | consultar auditoría |
| GET | `/api/audit/stream` | cookie (super-admin) | eventos en vivo (SSE) |
