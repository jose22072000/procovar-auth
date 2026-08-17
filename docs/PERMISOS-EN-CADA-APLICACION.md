# Los permisos, en cada aplicación

**Esto es obligatorio para TODAS las aplicaciones de Procovar**: PEDIDO, Analitics,
Delivery, Rutas, el Tablero Parranda y las que vengan. No es una recomendación ni un
patrón sugerido: una aplicación que no lo cumpla deja agujeros que nadie ve hasta que
alguien entra donde no debía.

## La regla

**Los permisos los reparte Accesos. La aplicación obedece.**

Ninguna aplicación decide por su cuenta quién puede qué. No hay listas de roles en el
código, ni `if rol == "supervisor"`, ni tablas de permisos propias. Se pregunta a
Accesos y se hace lo que diga.

El porqué es sencillo: si cada aplicación decide, "que la supervisora no vea los
informes" hay que cambiarlo en cinco sitios, y nadie puede responder qué puede hacer
una persona sin leer cinco códigos. Repartiéndolo en Accesos hay **una pantalla** —
Roles y permisos — donde se ve y se cambia todo, para las seis aplicaciones a la vez.

## Qué manda Accesos

`POST /api/auth/verify-session` (con las cabeceras de servicio) contesta, además de la
sesión:

```json
{
  "user":  { "id": "...", "name": "Liannet", "isSystemAdmin": false },
  "role":  "SUPERVISOR",
  "memberships": [ { "organization": { "id": "...", "name": "Granma" } } ],
  "rbac": {
    "org": "...",
    "wildcard": false,
    "global":      ["rutas.entrar", "rutas.calendario", "..."],
    "permissions": ["rutas.entrar", "rutas.calendario", "..."],
    "roles": ["SUPERVISOR"]
  }
}
```

Tres cosas y ninguna más:

- **`rbac.permissions`** — las llaves que tiene. Es la autoridad.
- **`rbac.wildcard`** — el Super Admin. Puede con todo sin enumerárselo.
- **`role`** — el nombre del rol de la persona, para lo que dependa del rol y no de un
  permiso (por ejemplo, a qué vendedores alcanza a ver).

### Lo que NO hay que mirar

**`memberships[].roles` no dice el rol.** Ahí va la columna `role` de better-auth, que
guarda `owner` y `member` — su vocabulario, no el catálogo de Procovar. Quien la lea
buscando `SUPERVISOR` no lo encuentra nunca, se queda sin rol y por tanto sin entrar.
Eso es exactamente lo que le pasó a una supervisora en Rutas: 403 y una pantalla en
blanco, sin nombre, sin menú y sin poder cerrar sesión.

## Qué tiene que hacer la aplicación

### 1. Declarar sus llaves en el catálogo de Accesos

En `src/rbac/permissions.catalog.ts`, con su `service` propio. Una llave por **cada
vista** y por **cada acción**:

```ts
e('rutas.entrar',      'Entrar', 'rutas', 'Entrar en Rutas', 'Access Rutas'),
e('rutas.calendario',  'Vistas', 'rutas', 'Ver el calendario', 'View the calendar'),
e('rutas.carpeta',     'Administración', 'rutas', 'Dar de alta carpetas', 'Add folders'),
```

Ver una pantalla y poder tocarla son llaves distintas: un gerente puede querer mirar
si las carpetas están al día sin poder darlas de baja.

Después, **Sincronizar** en Roles y permisos: hasta que se pulsa, las llaves están en
el código y no en la base, y nadie las tiene.

### 2. Exigirlas en la API

**En la API, no solo en la pantalla.** Una función que desaparece del menú pero sigue
contestando por su URL no está quitada, está escondida — y cualquiera con la dirección
la usa.

```go
r.With(Exige(PermCalendario)).Get("/calendar", s.calendar)
r.With(Exige(PermVisor)).Get("/day",      s.day)
r.With(Exige(PermCarpeta)).Post("/sources", s.createSource)
```

Y la entrada, una vez, en el middleware de sesión:

```go
if !identidad.Puede(PermEntrar) {
    respondError(w, http.StatusForbidden, "sin permiso: "+PermEntrar)
    return
}
```

El 403 dice **qué llave falta**. Quien lo lea en el registro sabe qué marcarle a esa
persona en Accesos, en vez de adivinar.

### 3. Decirle a la pantalla qué tiene

En el `/api/me` de la aplicación, la lista de llaves resueltas:

```json
{ "user": "Liannet", "role": "supervisor",
  "permisos": { "rutas.calendario": true, "rutas.bandeja": false } }
```

La pantalla **no decide, pregunta**: esconde del menú lo que la persona no tiene. Si se
le escapa algo, la API contesta 403 igual — la pantalla es comodidad, la API es la
cerradura.

### 4. La pantalla de «no tienes permiso»

Cuando alguien llega a una vista que no le toca, **no se pinta la vista y se le pone un
aviso encima**. No se pinta. Se enseña una página entera que dice qué pasa y ofrece la
salida: volver a Accesos o cerrar sesión.

Media pantalla cargada con datos que no debía ver, aunque sea un segundo, es una fuga.
Y un mensaje de error suelto sobre una tabla vacía no le dice a nadie qué hacer.

## Resumen para quien llega nuevo

1. Declara tus llaves en el catálogo de Accesos, una por vista y una por acción.
2. Sincroniza.
3. Exige la llave en cada ruta de tu API.
4. Manda las llaves en tu `/api/me` y esconde lo que no tenga.
5. Pon la página de «no tienes permiso», con salida.

Nada de roles en tu código. Si te ves escribiendo `if rol ==`, es que lo estás haciendo
en el sitio equivocado.
