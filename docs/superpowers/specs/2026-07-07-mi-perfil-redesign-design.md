# Diseño — "Mi perfil" (rediseño del rellenado de datos personales en qb-auth)

- **Fecha:** 2026-07-07
- **Servicio:** qb-auth (Next.js, better-auth). Perfil bajo `src/app/(user)/profile/`.
- **Objetivo:** Sacar los "Datos personales" de la página `Configuración` (que se siente técnica) a una página propia, amena y orientada al usuario ("Mi perfil"), y hacer el rellenado menos tedioso con gamificación moderada. Todo debe seguir funcionando.

## Contexto actual

- La entrada de datos personales vive hoy en `src/app/(user)/profile/config/_form.tsx`, en una página titulada **"Configuración"** (icono engranaje) que mezcla: Datos personales, Métodos de pago, Seguridad (contraseña), Notificaciones y (admin) Administración.
- Campos de datos personales guardados vía `authClient.updateUser`: `name`, `phone`, `nationality`, `address`, `passportId`. `email` es solo lectura.
- Estado de usuario: `useFullUser()` (`src/components/full-user-provider`) con `refreshUser()`. Shell de página: `ProfilePageShell` (`src/components/profile/profile-page-shell`).
- **No existe** infraestructura de subida de imágenes en qb-auth. `user.image` solo se llena vía OAuth.

## Decisiones (confirmadas con el usuario)

1. **Propósito de los datos:** enriquecimiento opcional. Nada bloquea al usuario; el perfil se completa "porque sí". → progreso con % y recompensas suaves.
2. **Tono:** moderado. Pulido + celebraciones sutiles (check animado, confeti al 100%) + badge "Perfil completo". Sin puntos/XP/mascota.
3. **Estructura:** separar **"Mi perfil"** (datos personales, orientado a usuario) de **"Configuración"** (seguridad/notificaciones/pagos/admin).
4. **Modo de rellenado:** híbrido **B+A** — wizard conversacional cuando el perfil está incompleto; página con anillo para editar cuando está completo.
5. **Avatar:** iniciales (color por plan) + imagen OAuth si existe. **Sin subida de foto** por ahora.

## Alcance

### Rutas y navegación

- **Nueva ruta `/profile/me`**, título **"Mi perfil"**, icono de usuario (no engranaje). Contiene avatar (iniciales) + datos personales gamificados.
- **`/profile/config`** deja de mostrar el bloque "Datos personales". Mantiene: Métodos de pago, Seguridad, Notificaciones, Administración. Sigue titulándose Configuración/Ajustes.
- El CTA que antes llevaba a "Configuración" para editar datos pasa a **"Mi perfil"**. En el dashboard de perfil se añade una **tarjeta con anillo de progreso** ("Perfil 60% · Completar") que enlaza a `/profile/me`.

### Modo de rellenado (híbrido B+A)

- **Perfil incompleto → wizard conversacional (modo B):** una pregunta grande por pantalla en el orden nombre → teléfono → nacionalidad → dirección → pasaporte/DNI. Barra de progreso "Paso N de 5". Botón **"Saltar"** siempre visible (ningún campo es obligatorio). **Confeti** al terminar.
- **Perfil completo, o al pulsar "editar" → página con anillo (modo A):** todos los campos en tarjetas, **guardado automático por campo** (al salir del input), check verde al validar.
- Un único origen de verdad de datos: wizard y página A escriben lo mismo vía `authClient.updateUser`. La decisión wizard-vs-página se basa en el % de completitud (umbral: <100% => wizard la primera vez; el usuario puede pasar a modo edición manualmente).

### Gamificación (moderado)

- **Completitud** = campos rellenos / 5 (`name`, `phone`, `nationality`, `address`, `passportId`). Anillo/barra morada con el %.
- Micro-celebración: check animado por campo guardado; **confeti** al llegar al 100%; **badge "Perfil completo"**.
- Microcopy cálido. **Tooltips "por qué"** en nacionalidad y pasaporte/DNI: "agiliza tus futuras reservas y el check-in del hotel".

### Avatar

- Iniciales con color por plan (coherente con el header ya arreglado). Si `user.image` (OAuth) existe, se muestra. **Sin subida de archivo** — no se añade storage.

## Componentes (unidades y responsabilidades)

- `src/app/(user)/profile/me/page.tsx` — server component: carga usuario, decide estado inicial (wizard vs edición) por completitud, renderiza el cliente.
- `MiPerfilClient` (`_client.tsx`) — orquesta wizard ↔ página A, mantiene el form state, llama a `authClient.updateUser` + `refreshUser`.
- `ProfileWizard` — modo B: pasos, progreso, saltar, confeti final. Recibe valores + `onSave(field, value)`.
- `ProfileEditor` — modo A: tarjetas de campos con guardado por campo y anillo de progreso.
- `useProfileCompleteness(user)` — hook puro: devuelve `{ percent, filled, missing, isComplete }` sobre los 5 campos. Reutilizado por la tarjeta del dashboard, el wizard y el editor.
- `ProfileProgressRing` — presentacional: anillo + %.
- Tarjeta de dashboard en `/profile` que usa `useProfileCompleteness` y enlaza a `/profile/me`.

Interfaces: cada unidad recibe el usuario/valores por props y notifica cambios por callback; ninguna llama a hooks de datos por su cuenta salvo el client raíz. El cálculo de completitud es una función pura testeable aislada.

### Qué se elimina/mueve

- El bloque "Datos personales" (`SectionCard` de datos + `handleSaveProfile`) sale de `config/_form.tsx` y se reimplementa en los nuevos componentes. El resto de `config/_form.tsx` (pagos, seguridad, notificaciones, admin) permanece.

## Flujo de datos

1. `page.tsx` (server) obtiene el usuario (misma vía que hoy usa el perfil) y lo pasa al client.
2. Client calcula completitud → elige wizard o editor.
3. Cada guardado → `authClient.updateUser({...})` → en éxito `refreshUser()` y recálculo de completitud → posible celebración/badge.
4. Al 100% desde el wizard → confeti → queda en `/profile/me` en **modo edición** (página A), con el badge "Perfil completo" visible.

## Manejo de errores

- Guardado por campo: si `updateUser` devuelve error, se revierte visualmente el check y se muestra mensaje corto ("No se pudo guardar, reintenta"). El resto de campos no se ven afectados (guardado independiente).
- Wizard "Saltar": no escribe nada, avanza. Ningún campo es obligatorio, así que nunca se bloquea el avance.
- Email es solo lectura: no participa en guardado ni en completitud.

## Pruebas

- `useProfileCompleteness` — unit: 0%, parcial, 100%, campos vacíos/whitespace.
- `ProfileWizard` — saltar avanza sin guardar; guardar llama al callback; confeti solo al completar el último con todo lleno.
- `ProfileEditor` — guardado por campo llama `updateUser` con solo ese campo; error revierte el check.
- No romper los tests existentes del perfil (`profile/__tests__`).

## Restricciones

- **Sin nuevos env vars** ni cambios de backend (el usuario controla config vía Dokploy).
- **Sin storage nuevo** (sin subida de foto).
- Reutilizar HeroUI + patrones/estilos existentes del perfil. Mantener i18n (next-intl) si el resto del perfil lo usa.

## Fuera de alcance (YAGNI)

- Subida real de foto de perfil (futuro; requiere storage).
- Puntos/XP/niveles/mascota.
- Cambios en seguridad, notificaciones, pagos o admin.
