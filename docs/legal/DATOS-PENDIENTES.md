# Datos legales: qué está resuelto y qué falta

Actualizado 2026-08-06 tras la búsqueda de datos. Todo se edita en un único archivo:
[`src/lib/legal/company.ts`](../../src/lib/legal/company.ts). Comprobador: `npx tsx scripts/check-legal-placeholders.ts`.

**Estado: 2 datos bloqueantes · 11 valores publicados a confirmar.**

---

## 1. Resuelto y ya publicado (verificado)

| Dato | Valor | Fuente |
|---|---|---|
| Razón social | Explotaciones Hosteleras Infantas, S.L. | Registro público + textos existentes de QBT |
| C.I.F. | B-88590989 | DatosCIF |
| Domicilio social | Calle de las Palmas 44, 1.º B — 28938 Móstoles (Madrid) | DatosCIF (coincide con el texto ya publicado en hostravel.com) |
| Objeto social / CNAE | Hoteles y alojamientos similares | DatosCIF / Empresia |
| Capital social | 3.000 € | DatosCIF / Empresia |
| Administrador único | Eliht Galindo Segurola (desde 29/01/2024) | DatosCIF |
| Teléfono | +34 919 540 882 | Sitio publicado |
| Dominio del portal | hostravel.com (activo, HTTP 200) | Comprobado |
| Dominio de cuenta/pago | account.hostravel.com (activo) | Comprobado |
| Dominio del panel | **extranet.hostravel.com** (activo, título «HTPanel») | Confirmado por el propietario |
| Encargados del tratamiento | Redsys + adquirente · Divergtech (infraestructura y correo, `mail.divergtech.com`) · Cloudflare · FNSrooms (PMS) | `.env` de los servicios, cabeceras HTTP, registro MX de hostravel.com |

## 2. Bloqueante — sin esto no se puede publicar (2)

| # | Campo | Qué necesito exactamente | Quién lo tiene |
|---|---|---|---|
| 1 | `cardDescriptor` | El texto que verá el cliente en el extracto de su tarjeta (p. ej. `HOSTRAVEL` o `EXPL HOST INFANTAS`) | **Tu banco / entidad adquirente**, al dar de alta el comercio |
| 2 | `orgEconomicModel` | Qué cobráis a las organizaciones: comisión por reserva (%), tarifa fija o suscripción | **Decisión vuestra** |

## 3. Publicado pero a confirmar (11)

Ya se muestra un valor real; solo hay que decir «sí» o corregirlo.

| # | Valor publicado | Qué confirmar |
|---|---|---|
| 3 | Registro Mercantil de Madrid, **Tomo 40.246, Folio 92, Sección 8, Hoja M-715053** | Los registros públicos coinciden en tomo/sección/hoja pero difieren en el folio (90 en la constitución, 92 en la última inscripción). Pídele una **nota simple** al Registro y lo dejamos exacto |
| 4 | `reservas@hostravel.com` | El buzón **tiene que existir y estar atendido**. El MX de hostravel.com apunta a `mail.divergtech.com`, así que se crea ahí. Hoy el sistema usa `noreply@hostravel.com` y `dokploy@hostravel.com`, que **no sirven** como contacto legal |
| 5 | `privacidad@hostravel.com` | Buzón para derechos RGPD; puede redirigir al de soporte |
| 6 | «No resulta obligatorio designar DPD (art. 37 RGPD)» | Confirmar con la asesoría. Si tratáis datos a gran escala, sí haría falta |
| 7 | WhatsApp +34 613 415 444 | ¿Sigue operativo? Está publicado en el pie de hostravel.com |
| 9 | Ordenar devolución en **5 días hábiles** | Que la operativa real pueda cumplirlo (hoy la devolución se ordena a mano) |
| 10 | Resolver cancelaciones especiales en **10 días hábiles** | Igual |
| 11 | Preaviso de **30 días** con organizaciones | Confirmar |
| 12 | Entrada en vigor: **6 de agosto de 2026** | Ajustar al día real de publicación |
| 13 | Divergtech — ubicación «Unión Europea» | Confirmar proveedor de hosting/VPS y país de los servidores, y que hay **contrato de encargado del tratamiento (art. 28 RGPD)** firmado |
| 14 | FNSrooms — ubicación «Unión Europea» | Confirmar razón social exacta del proveedor PMS y contrato art. 28 |

## 4. Decisión de negocio pendiente (1)

| # | Decisión | Por qué importa |
|---|---|---|
| 15 | **Quién factura cada reserva**: alojamientos propios de Explotaciones Hosteleras Infantas vs. de terceros (cobro en nombre y por cuenta) | Es la cláusula 2 de las Condiciones y determina IVA y emisor de factura. Confírmalo con la asesoría fiscal |

## 5. Lo que hay que pedirle al banco / Redsys

| # | Elemento |
|---|---|
| 16 | Confirmar que el comercio (FUC) tiene **InSite habilitado** en sandbox y producción |
| 17 | Confirmar **tokenización / pago por referencia (COF)** habilitada |
| 18 | **Descriptor de comercio** (dato nº 1) |
| 19 | Declarar el dominio **account.hostravel.com** para InSite |
| 20 | Cumplimentar el **SAQ PCI DSS** que exija el adquirente (con InSite: **SAQ A-EP**) |

## 6. Datos que no he podido obtener

| Dato | Motivo | Cómo conseguirlo |
|---|---|---|
| **Números de registro turístico** de cada alojamiento | Están en la base de datos de producción (`properties.rental_license_number`), a la que no accedo | Exportarlos desde el panel, o dímelo y preparo la consulta para que la ejecutes tú |
| Datos fiscales de los propietarios (`owners.tax_id`) | Igual | Igual |

## 7. Otros arreglos que dependen de estos datos

- `hostravel.com` (QBT) sigue publicando `reservas@empresa.com` y textos fechados en «Enero 2025» → se corrige en cuanto se confirme el dato nº 4.
- El FAQ de `hostravel.com` dice que se aceptan **transferencia bancaria y PayPal**, que no están implementados. Los bancos revisan esas afirmaciones: hay que corregirlo.
- Los correos transaccionales salen como `dokploy@divergtech.com` / «Divergtech». Para un cliente que acaba de pagar, el remitente debería ser HOSTRAVEL.
