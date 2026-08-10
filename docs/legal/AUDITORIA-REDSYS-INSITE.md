# Auditoría de cumplimiento — `account.hostravel.com` para la activación de Redsys InSite

**Fecha:** 2026-08-06 · **Alcance:** dominio de pago `account.hostravel.com` (qb-auth), con referencias a `hostravel.com` (QBT) y a qb-back (crypto Redsys).
**Objetivo:** determinar si el sitio cumple los requisitos que la entidad adquirente / Redsys revisan antes de habilitar el TPV Virtual en modalidad **InSite** (pago integrado en página) con **tokenización / pago por referencia**.

**Veredicto: NO CUMPLE todavía.** El motor de pago está técnicamente avanzado, pero el sitio **no publica ninguna página legal** y el checkout **no recoge la aceptación de condiciones**. Son exactamente los puntos que la entidad revisa a ojo antes de dar de alta el comercio.

---

## 1. Resumen de hallazgos

| # | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| 1 | No existe **ninguna página legal** en el dominio de pago: `/terms`, `/privacy`, `/legal`, `/cookies`, `/aviso-legal` devuelven **404** | 🔴 Bloqueante | `curl` sobre `https://account.hostravel.com/*` |
| 2 | No existe **pie de página** ni enlaces legales en ninguna pantalla (tampoco en el checkout) | 🔴 Bloqueante | No hay ningún componente `footer` en `qb-auth/src` |
| 3 | La página de pago **no identifica al comercio** (razón social, CIF, domicilio, contacto) | 🔴 Bloqueante | [booking-page-client.tsx:529-633](../../src/app/(base)/booking/_components/booking-page-client.tsx#L529-L633) |
| 4 | El checkout **no exige aceptación expresa** de condiciones de contratación ni de la política de cancelación | 🔴 Bloqueante | No hay checkbox ni texto de aceptación en el paso 3 |
| 5 | La **política de cancelación de la tarifa no se muestra** antes de pagar | 🟠 Alta | Sin referencias a `cancellationPolicy` en `src/app/(base)/booking/` |
| 6 | No se informa de la **exclusión del derecho de desistimiento** (art. 103.l TRLGDCU) | 🟠 Alta | — |
| 7 | No hay **datos de contacto ni atención al cliente** en el dominio de pago | 🟠 Alta | — |
| 8 | El correo publicado en los textos legales de `hostravel.com` es un **placeholder** (`reservas@empresa.com`) | 🟠 Alta | [QuickBookTravelFrontend/src/i18n/es.ts](../../../QuickBookTravelFrontend/src/i18n/es.ts) — `privacyPage`/`termsPage` |
| 9 | El cargo por token (**COF**) no incluye `DS_MERCHANT_COF_INI` en las operaciones sucesivas | 🟠 Alta (técnica) | [qb-back/internal/lib/redsys/redsys.go](../../../qb-back/internal/lib/redsys/redsys.go) — `tokenChargeMerchantParams` |
| 10 | Faltan **cabeceras de seguridad**: HSTS, CSP, X-Frame-Options/`frame-ancestors`, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | 🟠 Alta | `curl -I https://account.hostravel.com/` → ninguna presente |
| 11 | No hay **política de cookies** publicada (aunque hoy solo se usan cookies técnicas) | 🟡 Media | Sin librería de consentimiento en `qb-auth` |
| 12 | No se muestran **logotipos de marcas de tarjeta** ni de la pasarela en el paso de pago | 🟡 Media | — |
| 13 | El aviso de seguridad es genérico («cifrado SSL») y no menciona Redsys, 3D Secure ni la no conservación del PAN | 🟡 Media | `messages/es.json:463`, `booking/_lib/translations.ts` |
| 14 | No se guarda **evidencia de la versión de condiciones aceptada** por reserva | 🟡 Media | — |
| 15 | El **total mostrado se recalcula en cliente** (impuestos con `taxRate` de respaldo) mientras el importe cobrado procede de la factura de qb-back | 🟡 Media | [price-summary.tsx:60-74](../../src/app/(base)/booking/_components/price-summary.tsx#L60-L74) |
| 16 | Banner de modo pruebas de SumUp con texto fijo en español | 🟢 Baja | booking-page-client.tsx:594-598 |
| 17 | Los textos legales de `hostravel.com` están fechados en «Enero 2025» y carecen de aviso legal con datos registrales, cookies, ODR y AEPD | 🟠 Alta | `src/i18n/es.ts` |

## 2. Requisitos de la entidad adquirente / Redsys y estado actual

Lo que se comprueba en el alta de un comercio de TPV Virtual (y con más detalle en InSite, porque la captura de tarjeta ocurre en tu propio dominio):

| Requisito | Estado |
|---|---|
| Web accesible y operativa bajo **HTTPS** en todas las páginas, incluida la de pago | ✅ Cumple (TLS vía Cloudflare, HTTP 200) |
| **Identificación del titular** (razón social, CIF, domicilio, contacto) a un clic | ❌ No existe en el dominio de pago |
| **Condiciones de contratación** accesibles antes de pagar | ❌ No existen |
| **Política de devoluciones / cancelaciones** publicada | ❌ No existe (la lógica sí está implementada en qb-back) |
| **Política de privacidad** y **política de cookies** | ❌ No existen en `account.hostravel.com` |
| **Descripción del servicio y precios** con impuestos y divisa | ⚠️ Parcial: se muestra el desglose en el checkout, pero sin marco legal ni divisa declarada fuera del importe |
| **Medios de pago admitidos** identificados con sus logotipos | ❌ No se muestran |
| **Datos de contacto / atención al cliente** visibles | ❌ No en el dominio de pago |
| **Aceptación expresa de condiciones** antes del pago | ❌ No implementada |
| Botón de pago con indicación inequívoca de obligación de pago | ⚠️ «Pagar Ahora →» — admisible, pero conviene mostrar el importe en el propio botón |
| **PCI DSS**: cuestionario de autoevaluación (SAQ **A-EP** con InSite) | ⚠️ Pendiente de completar y conservar evidencia |
| **InSite + tokenización («pago por referencia»)** habilitados en el FUC/terminal | ⚠️ Pendiente de confirmar con la entidad |
| Dominio(s) declarados a la entidad para InSite | ⚠️ Pendiente |

## 3. Detalle de los hallazgos bloqueantes

### 3.1 Sin páginas legales ni pie de página
Comprobado con `curl`: `/terms`, `/privacy`, `/legal`, `/cookies`, `/aviso-legal`, `/terminos`, `/politica-de-privacidad` → **404**. En `qb-auth/src` no existe ningún componente de pie de página, de modo que ni siquiera hay enlaces a los textos de `hostravel.com`. Para la entidad esto es motivo directo de denegación o de suspensión posterior del alta.

**Solución:** publicar los seis documentos de `docs/legal/` como rutas en `account.hostravel.com` y añadir un pie de página global con los enlaces, presente también en el checkout.

### 3.2 Sin aceptación de condiciones en el checkout
El paso 3 ([booking-page-client.tsx](../../src/app/(base)/booking/_components/booking-page-client.tsx)) muestra el resumen, un aviso de pago seguro y el botón de pago. No hay casilla de aceptación, ni enlaces a condiciones, ni resumen de la política de cancelación, ni aviso de exclusión del desistimiento.

**Solución:** casilla **no premarcada** que bloquee el botón de pago hasta su marcado, con texto del tipo:

> He leído y acepto las **Condiciones Generales de Contratación**, la **Política de Cancelaciones y Reembolsos** y la **Política de Privacidad**. Entiendo que, al tratarse de un servicio de alojamiento con fecha determinada, **no dispongo del derecho de desistimiento de 14 días** (art. 103.l TRLGDCU) y que se aplicarán las condiciones de cancelación de la tarifa contratada.

Y persistir con la reserva: `terms_version`, `accepted_at`, IP y agente de usuario (defensa ante *chargebacks*).

### 3.3 Comercio no identificado en la página de pago
El usuario paga sin ver a quién paga. Debe figurar, como mínimo en el pie: razón social, CIF, domicilio, correo y teléfono de atención, y el **descriptor** con el que aparecerá el cargo en el extracto.

## 4. Hallazgos técnicos relevantes para InSite

### 4.1 COF / pago por referencia — `DS_MERCHANT_COF_INI` ausente en el cargo por token
`tokenChargeMerchantParams` en [qb-back/internal/lib/redsys/redsys.go](../../../qb-back/internal/lib/redsys/redsys.go) envía `DS_MERCHANT_IDENTIFIER`, `Ds_Merchant_Cof_Txnid` y `DS_MERCHANT_COF_TYPE`, pero **no** `DS_MERCHANT_COF_INI = "N"`, que marca la operación como *subsiguiente* de una credencial ya registrada. La operación inicial sí lo envía (`COF_INI = "S"`). Además debe decidirse y reflejarse si el cargo con tarjeta guardada es **CIT** (cliente presente en el checkout, caso actual) o **MIT**, ya que de ello dependen la exención de SCA aplicable y el traslado de responsabilidad.

**Acción:** contrastar con la guía oficial de Redsys de COF/pago por referencia (no de memoria: es un flujo de pagos), añadir `COF_INI="N"` y cubrirlo con un test de vectores como los ya existentes en `internal/lib/redsys/redsys_insite_test.go`.

### 4.2 Cabeceras de seguridad
Ninguna de HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy o Permissions-Policy está presente. Con InSite el `iframe` de Redsys se incrusta en nuestra página, por lo que conviene:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- CSP con `frame-src`/`script-src` limitados a los dominios de Redsys (`sis.redsys.es`, `sis-t.redsys.es`) y `frame-ancestors 'self'` para evitar que nuestro checkout sea embebido por terceros (*clickjacking* sobre la pantalla de pago)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

### 4.3 Estado de la integración InSite
En qb-auth el conmutador de pasarela solo contempla `sumup` y `redsys` (redirección) y no existe aún el componente de InSite; la parte de qb-back (firma InSite, tokenización, cargo por token) sí está implementada y probada. Es coherente con el plan de fases, pero **el alta de InSite ante la entidad conviene tramitarla con el sitio ya conforme legalmente**, porque es lo primero que revisan.

### 4.4 Consistencia del importe mostrado y del cobrado
El resumen recalcula impuestos en el cliente con un `taxRate` de respaldo, mientras el importe cobrado procede de la factura generada por qb-back. Deben coincidir siempre: lo recomendable es que el checkout **muestre el total de la factura** tal cual lo devuelve qb-back, sin recomponerlo.

## 4.5 Estado tras la implementación del 2026-08-06

| # | Hallazgo | Estado |
|---|---|---|
| 1 | Páginas legales inexistentes | ✅ **Corregido** — 7 documentos publicados en `/legal/*` |
| 2 | Sin pie de página | ✅ **Corregido** — `SiteFooter` en el layout raíz (todas las páginas, incluido el checkout) |
| 3 | Comercio no identificado en la página de pago | ✅ **Corregido** — razón social, CIF, domicilio y contacto en el pie |
| 4 | Sin aceptación de condiciones | ✅ **Corregido** — casilla no premarcada que bloquea el botón de pago + registro de evidencia (`terms_acceptances`: versión, IP, user-agent, factura) |
| 5 | Política de cancelación de la tarifa no visible | ⚠️ **Parcial** — se enlaza el documento general; mostrar la política concreta requiere que qb-back la devuelva en `verify-booking` |
| 6 | Exclusión del desistimiento no informada | ✅ **Corregido** — texto del art. 103.l bajo la casilla de aceptación |
| 7 | Sin datos de contacto en el dominio de pago | ✅ **Corregido** — pie de página (pendiente el correo real) |
| 8 | Correo placeholder en `hostravel.com` | ⛔ **Bloqueado** — falta el dato del propietario |
| 9 | `DS_MERCHANT_COF_INI` ausente en el cargo por token | ⛔ **No corregido** — toca la firma de pagos; requiere vectores + sandbox |
| 10 | Cabeceras de seguridad | ✅ **Corregido** — HSTS, nosniff, Referrer-Policy, Permissions-Policy y CSP con `frame-ancestors`/`frame-src`/`form-action` para Redsys y SumUp |
| 11 | Política de cookies | ✅ **Corregido** — publicada (solo cookies técnicas, sin banner obligatorio) |
| 12 | Marcas de tarjeta y pasarela no visibles | ✅ **Corregido** — «Visa · Mastercard · 3D Secure · Redsys» en el paso de pago y en el pie |
| 13 | Aviso de seguridad genérico | ✅ **Corregido** — menciona Redsys, TLS, 3D Secure y la no conservación de PAN/CVV |
| 14 | Sin evidencia de la versión aceptada | ✅ **Corregido** — `TermsAcceptance.termsVersion` + fecha + IP |
| 15 | Total recalculado en cliente | ⚠️ **Pendiente** |
| 16 | Banner SumUp sin traducir | ⚠️ **Pendiente** (bajo) |
| 17 | Textos legales de `hostravel.com` desfasados | ⛔ **Bloqueado** por el dato del correo real |

Verificación ejecutada: `tsc --noEmit` limpio, `next build` correcto, 18 tests nuevos en verde (139/139 salvo 2 fallos preexistentes en `role-resolver.test.ts`, ajenos a este cambio), y arranque real del servidor comprobando `200` en las 7 rutas legales, `404` en un slug inexistente y presencia de las cabeceras de seguridad en la respuesta.

## 5. Plan de corrección propuesto

**Fase 1 — imprescindible antes de solicitar InSite**
1. Completar los datos «PENDIENTE» de los documentos de `docs/legal/` (registro mercantil, correo real, descriptor de comercio, plazos de reembolso).
2. Publicar las rutas legales en `account.hostravel.com`: `/legal/aviso-legal`, `/legal/condiciones`, `/legal/privacidad`, `/legal/cookies`, `/legal/pagos`, `/legal/cancelaciones`.
3. Pie de página global con esos enlaces + razón social, CIF y contacto, visible también en el checkout.
4. Casilla de aceptación de condiciones en el paso de pago, con aviso de exclusión del desistimiento y resumen de la política de cancelación de la tarifa; persistir la evidencia de aceptación.
5. Sustituir el correo `reservas@empresa.com` por el real en `hostravel.com` y alinear sus textos con estos documentos.

**Fase 2 — refuerzo (antes de pasar a producción con InSite)**
6. Logotipos de Visa/Mastercard y mención a Redsys y 3D Secure en el paso de pago; sustituir el aviso genérico de «cifrado SSL».
7. Cabeceras de seguridad (HSTS + CSP con `frame-src` de Redsys y `frame-ancestors 'self'`).
8. `DS_MERCHANT_COF_INI="N"` en el cargo por token + decisión CIT/MIT documentada, con tests.
9. Mostrar el total de la factura de qb-back en lugar de recalcularlo en el cliente.
10. Completar el SAQ A-EP y confirmar con la entidad la habilitación de InSite y de tokenización, así como los dominios declarados.

**Fase 3 — mejora continua**
11. Enlaces legales en los correos transaccionales de qb-notify.
12. Página de contacto / atención al cliente en el dominio de pago.
13. Revisión anual de los textos y versionado (`terms_version`).
