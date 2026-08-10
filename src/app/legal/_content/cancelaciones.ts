import { COMPANY } from "@/lib/legal/company";

export const cancelaciones = `
Esta Política desarrolla la cláusula 9 de las [Condiciones Generales de Contratación](/legal/condiciones) y se muestra al usuario antes de completar el pago.

## 1. Regla general

La política de cancelación aplicable a cada reserva es la de la **tarifa contratada**. Se muestra en la ficha del alojamiento, en el resumen previo al pago y en el correo de confirmación, y prevalece sobre cualquier regla general de este documento cuando resulte más favorable al usuario.

## 2. Tipos de política de cancelación

| Tipo | Efecto |
|---|---|
| Totalmente reembolsable | Cancelación sin coste en cualquier momento anterior a la entrada; se reembolsa el 100 % del importe pagado. |
| Reembolsable con ventana de cancelación gratuita | Cancelación sin coste hasta el límite de cancelación gratuita (un número determinado de días antes de la entrada y, en su caso, una hora de corte). Superado ese límite, se aplica un cargo por cancelación tardía. |
| No reembolsable | La cancelación no genera derecho a reembolso; se factura el 100 % del importe. |
| Condiciones particulares | Determinadas tarifas pueden tener condiciones propias; en ese caso la solicitud se somete a revisión individual y se comunica el resultado al usuario. |

## 3. Cargo por cancelación tardía

Cuando la tarifa es reembolsable y la cancelación se produce fuera de la ventana gratuita, se aplica el cargo previsto por la tarifa, que puede ser el importe de la primera noche, el 50 % del importe total de la reserva o el 100 % del importe total.

El cargo nunca excederá el importe total pagado. El importe reembolsable es el resultado de restar dicho cargo al total de la reserva.

**Ejemplo.** Reserva de 400 € con cancelación gratuita hasta 7 días antes de la entrada y cargo por cancelación tardía equivalente a la primera noche (100 €):

- Cancelación 10 días antes: reembolso de 400 €.
- Cancelación 3 días antes: cargo de 100 € y reembolso de 300 €.

## 4. Cómo cancelar

1. Acceda a ${COMPANY.accountDomain} y abra la sección «Mis reservas».
2. Seleccione la reserva y pulse «Cancelar».
3. La Plataforma muestra el importe reembolsable estimado según la política de la tarifa antes de confirmar.
4. Al confirmar, se registra la solicitud de cancelación, se comunica al alojamiento y el usuario recibe un correo con el detalle.

También puede solicitarse la cancelación en ${COMPANY.supportEmail} o en el ${COMPANY.phone}, indicando el localizador de la reserva. **La fecha y hora que determinan el cargo son las de la recepción de la solicitud.**

## 5. Tramitación del reembolso

5.1. El reembolso se abona al mismo medio de pago utilizado en la compra.

5.2. Plazos: ${COMPANY.brand} ordena la devolución en un plazo máximo de ${COMPANY.refundOrderDeadline} desde la aceptación de la cancelación; el abono efectivo depende de la entidad emisora y suele producirse en 5 a 10 días hábiles adicionales.

5.3. Los importes pagados con vale se restituyen como saldo de vale, no en efectivo. Los cupones de descuento aplicados no se reembolsan ni se reactivan salvo indicación en contra de la promoción.

5.4. Las solicitudes sujetas a revisión individual se resuelven en un plazo máximo de ${COMPANY.customPolicyReviewDeadline}, comunicando al usuario el importe finalmente reconocido.

## 6. Cancelaciones no imputables al usuario

Si el alojamiento cancela la reserva o no puede prestar el servicio contratado, el usuario tendrá derecho, a su elección, al reembolso íntegro de lo pagado o a una alternativa de características equivalentes, sin perjuicio de la indemnización que legalmente proceda.

## 7. Modificaciones en lugar de cancelación

Cuando la tarifa lo permita, el usuario puede solicitar un cambio de fechas u ocupación en lugar de cancelar. La modificación está sujeta a disponibilidad y puede implicar diferencia de precio, que se comunicará antes de aplicarla.

## 8. No presentación y salida anticipada

La no presentación en la fecha de entrada sin cancelación previa, o la salida anticipada, no dan derecho a reembolso salvo que la tarifa lo prevea expresamente.

## 9. Derecho de desistimiento

De acuerdo con el **artículo 103.l) del Real Decreto Legislativo 1/2007**, los servicios de alojamiento con fecha o periodo de ejecución determinados están excluidos del derecho de desistimiento de 14 días. Los derechos de cancelación aplicables son los de la tarifa contratada, descritos en este documento.

## 10. Reclamaciones

Cualquier discrepancia sobre un reembolso puede dirigirse a ${COMPANY.supportEmail}. Se responderá en el plazo máximo de un mes. El usuario consumidor dispone además de las hojas oficiales de reclamación y de la plataforma europea de resolución de litigios en línea: [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).
`.trim();
