import { COMPANY, COMPANY_ADDRESS } from "@/lib/legal/company";

export const condiciones = `
> Estas Condiciones se ponen a disposición del usuario antes de iniciar el pago y deben ser aceptadas expresamente mediante casilla no premarcada en el paso de pago. El usuario recibe copia de las Condiciones aceptadas junto con la confirmación de la reserva, en soporte duradero (correo electrónico).

## 1. Partes y objeto

1.1. Estas Condiciones Generales de Contratación (en adelante, «Condiciones») regulan la contratación de servicios de alojamiento y servicios accesorios ofrecidos en la Plataforma ${COMPANY.brand}, titularidad de **${COMPANY.legalName}**, con domicilio en ${COMPANY_ADDRESS}, C.I.F. ${COMPANY.taxId} (en adelante, «${COMPANY.brand}»).

1.2. Son parte del contrato: (i) el **Cliente**, persona física mayor de 18 años con capacidad para contratar, o persona jurídica que actúa a través de una cuenta de organización; y (ii) ${COMPANY.brand}, en la posición que se indica en la cláusula 2.

1.3. Se consideran también documentos contractuales, y se integran por referencia en estas Condiciones: el [Aviso Legal](/legal/aviso-legal), la [Política de Pagos y Seguridad](/legal/pagos), la [Política de Cancelaciones y Reembolsos](/legal/cancelaciones), la [Política de Privacidad](/legal/privacidad), la [Política de Cookies](/legal/cookies) y las condiciones particulares de la tarifa seleccionada (régimen, política de cancelación y condiciones de pago), que **prevalecen** sobre estas Condiciones en caso de contradicción y en lo que resulten más favorables al Cliente.

## 2. Papel de ${COMPANY.brand}

2.1. ${COMPANY.brand} comercializa alojamientos en dos supuestos:

- **Alojamientos propios o gestionados.** ${COMPANY.brand} actúa como prestador directo del servicio de alojamiento y es la parte contratante frente al Cliente.
- **Alojamientos de terceros.** ${COMPANY.brand} actúa como intermediario entre el Cliente y el titular del alojamiento (la «Organización» o «Propietario»), y cobra el precio en nombre y por cuenta de dicho titular. El contrato de alojamiento se perfecciona entre el Cliente y el alojamiento; ${COMPANY.brand} gestiona la reserva, el cobro, la facturación por cuenta del alojamiento y la atención al cliente asociada a la reserva.

2.2. En la ficha de cada alojamiento y en la confirmación de reserva se identifica al prestador del servicio. El pago realizado a ${COMPANY.brand} en el segundo supuesto libera al Cliente de su obligación de pago frente al alojamiento.

## 3. Cuenta de usuario e identidad única

3.1. Para completar una reserva es necesario disponer de una cuenta en ${COMPANY.accountDomain}. La cuenta funciona como identidad única (SSO) para todos los servicios de ${COMPANY.brand}.

3.2. El Cliente es responsable de la veracidad de los datos facilitados, de la custodia de sus credenciales y de toda actividad realizada desde su cuenta. Debe comunicar de inmediato cualquier uso no autorizado a través de los canales de contacto del Aviso Legal.

3.3. ${COMPANY.brand} podrá exigir la verificación de la dirección de correo electrónico y aplicar medidas antifraude, incluida la denegación o anulación de reservas con indicios razonables de fraude, suplantación o uso de medios de pago no autorizados.

3.4. **Cuentas de organización.** Las empresas pueden operar mediante cuentas de organización con varios miembros y permisos diferenciados. Quien acepta estas Condiciones en nombre de una organización declara tener poder suficiente para obligarla. Las condiciones específicas figuran en las [Condiciones para Organizaciones y Propietarios](/legal/organizaciones).

## 4. Proceso de contratación

4.1. **Selección.** El Cliente busca y selecciona alojamiento, fechas, ocupación, tipo de habitación o unidad y tarifa.

4.2. **Pre-reserva con retención temporal.** Al iniciar el proceso de pago, la Plataforma crea una pre-reserva que bloquea la disponibilidad durante un plazo limitado —por defecto **15 minutos**— mostrado mediante una cuenta atrás en pantalla. Transcurrido ese plazo sin completar el pago, la pre-reserva se cancela automáticamente, se libera la disponibilidad y no se genera cargo alguno. El plazo aplicable será siempre el que se muestre en pantalla en cada proceso.

4.3. **Datos del huésped.** El Cliente facilita los datos del titular de la reserva y, en su caso, de los huéspedes (nombre y apellidos, correo, teléfono y los datos identificativos exigidos por la normativa de registro de viajeros; véase la cláusula 11).

4.4. **Pago.** El Cliente revisa el resumen (alojamiento, fechas, huésped y desglose de precio con impuestos) y ejecuta el pago según la cláusula 6. Antes de pulsar el botón de pago debe aceptar expresamente estas Condiciones y la política de cancelación de la tarifa. El botón que cierra el proceso identifica de forma inequívoca la obligación de pago.

4.5. **Perfección del contrato.** El contrato queda perfeccionado cuando la entidad emisora autoriza el pago y ${COMPANY.brand} emite la confirmación de reserva por correo electrónico, con el localizador y el resumen de condiciones. Hasta ese momento no existe reserva confirmada, aunque exista pre-reserva.

4.6. **Rechazo o incidencia de pago.** Si el pago es denegado o no se completa, la reserva no se confirma y la disponibilidad se libera. Si por causas técnicas se produjera un cargo sin confirmación de reserva, ${COMPANY.brand} lo detectará mediante la conciliación de la pasarela y procederá a la devolución íntegra del importe.

4.7. **Errores manifiestos.** Si por un error evidente en el sistema (precio, disponibilidad o régimen manifiestamente incorrectos) se confirmara una reserva en condiciones anómalas, ${COMPANY.brand} podrá anularla comunicándolo sin demora y reembolsando la totalidad de lo pagado, sin más obligación de indemnización.

4.8. **Idioma.** El contrato puede formalizarse en español o inglés, a elección del Cliente. En caso de discrepancia entre versiones, prevalece la versión en español.

4.9. **Archivo del documento contractual.** ${COMPANY.brand} archiva el documento electrónico de la reserva, que el Cliente puede consultar y descargar en todo momento en ${COMPANY.accountDomain}, secciones «Mis reservas» y «Facturas».

## 5. Precios, impuestos y moneda

5.1. Los precios se expresan en **euros (EUR)** salvo que se indique expresamente otra divisa, e incluyen los impuestos indirectos aplicables (IVA en el tipo legalmente vigente para servicios de alojamiento).

5.2. El desglose mostrado antes del pago incluye: importe por alojamiento y estancia, suplementos aplicables, servicios adicionales seleccionados, descuentos aplicados e impuestos. El importe total mostrado junto al botón de pago es el importe que se cargará.

5.3. Determinados tributos o tasas de carácter local (por ejemplo, tasas turísticas municipales) pueden no estar incluidos y deberse directamente en el alojamiento. Cuando así sea, se indicará antes de completar la reserva.

5.4. **Servicios adicionales.** Los servicios de pago opcionales seleccionados durante la reserva se facturan según el precio y la unidad indicados (por estancia o por noche) y quedan incorporados al importe total.

5.5. Los precios pueden variar en cualquier momento; la variación no afecta a las reservas ya confirmadas.

## 6. Medios de pago

6.1. El pago se realiza en ${COMPANY.accountDomain} mediante los medios habilitados en cada momento: tarjeta bancaria (Visa, Mastercard y demás marcas admitidas) procesada a través del **TPV Virtual de Redsys** de la entidad adquirente de ${COMPANY.brand}, tanto en su modalidad de página segura como en la modalidad integrada InSite; tarjeta previamente guardada por el propio Cliente; otros proveedores de pago habilitados puntualmente e identificados en el proceso; y vales o cupones de descuento en las condiciones de la cláusula 7.

6.2. **${COMPANY.brand} no almacena en ningún momento el número completo de la tarjeta (PAN) ni el código de seguridad (CVV).** Cuando el Cliente guarda una tarjeta, se conserva únicamente un token emitido por Redsys y datos enmascarados (marca y últimos cuatro dígitos). El detalle figura en la [Política de Pagos y Seguridad](/legal/pagos).

6.3. **Autenticación reforzada (SCA).** Conforme a la Directiva (UE) 2015/2366 (PSD2), la operación puede requerir autenticación reforzada mediante 3D Secure. Dicha autenticación se realiza entre el Cliente y su entidad emisora.

6.4. **Momento del cargo.** Salvo que la tarifa indique otra cosa, el importe total se carga en el momento de la reserva. Los conceptos que se paguen en destino se identifican expresamente antes del pago.

6.5. **Concepto en el extracto.** El cargo aparecerá en el extracto de la tarjeta bajo el identificador ${COMPANY.cardDescriptor}.

6.6. **Facturación.** ${COMPANY.brand} pone a disposición del Cliente la factura o justificante de la reserva en ${COMPANY.accountDomain}, sección «Facturas», descargable en cualquier momento.

## 7. Descuentos, cupones y vales

7.1. **Cupones.** Códigos promocionales creados por una organización y aplicables a alojamientos concretos. Pueden estar sujetos a fechas de validez, estancia mínima o máxima y número máximo de usos. Se aplican en el momento de la reserva y no son canjeables por dinero.

7.2. **Vales.** Crédito nominativo concedido por una organización a un Cliente, aplicable a reservas en los alojamientos de esa organización. El vale es personal e intransferible, tiene un saldo, una divisa y, en su caso, una fecha de caducidad; se consume total o parcialmente y su saldo restante queda disponible para reservas posteriores.

7.3. Los vales y cupones no son canjeables por efectivo ni generan intereses. Si una reserva pagada parcialmente con un vale se cancela con derecho a reembolso, el importe correspondiente al vale se restituye como saldo de vale y no como devolución dineraria, salvo que la normativa aplicable exija lo contrario.

7.4. ${COMPANY.brand} podrá anular descuentos obtenidos de forma fraudulenta, mediante duplicación de cuentas o incumpliendo las condiciones de la promoción.

## 8. Modificación de la reserva

8.1. Las solicitudes de modificación (fechas, ocupación, tipo de unidad o datos del huésped) están sujetas a disponibilidad y a las condiciones de la tarifa. Pueden implicar diferencia de precio, que se comunicará antes de confirmarse.

8.2. Los datos del huésped comunicados en la Plataforma se transmiten al sistema de gestión del alojamiento. Las modificaciones aceptadas se reflejan en la reserva y se notifican por correo electrónico.

## 9. Cancelaciones, reembolsos y derecho de desistimiento

9.1. Las condiciones de cancelación aplicables son las de la tarifa contratada, que se muestran antes del pago y se reproducen en la confirmación. El procedimiento, los plazos y el cálculo del importe reembolsable se detallan en la [Política de Cancelaciones y Reembolsos](/legal/cancelaciones).

9.2. **Exclusión del derecho de desistimiento.** De conformidad con el **artículo 103.l) del Real Decreto Legislativo 1/2007** (texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios), no resulta aplicable el derecho de desistimiento de 14 días a los contratos de servicios de alojamiento para fines distintos del de servir de vivienda cuando se prevé una fecha o periodo de ejecución específicos. El Cliente reconoce expresamente esta exclusión al aceptar estas Condiciones, sin perjuicio de los derechos de cancelación que le otorgue la tarifa contratada.

9.3. La cancelación por parte del alojamiento por causas justificadas o de fuerza mayor dará derecho al reembolso íntegro de lo pagado o, si el Cliente lo acepta, a una alternativa de características equivalentes.

## 10. Obligaciones del Cliente y normas del alojamiento

10.1. El Cliente debe: facilitar datos veraces; presentar documento de identidad válido en el registro de entrada; respetar los horarios de entrada y salida, la capacidad máxima contratada y las normas internas del alojamiento; y hacer un uso diligente de las instalaciones.

10.2. El incumplimiento de las normas del alojamiento, la ocupación por un número de personas superior al contratado o los daños causados dolosa o negligentemente podrán dar lugar a la resolución de la estancia sin derecho a reembolso y a la reclamación de los daños.

10.3. El alojamiento podrá exigir una garantía o preautorización en destino cuando así se haya informado previamente.

## 11. Registro de viajeros y obligaciones administrativas

Los establecimientos de hospedaje están obligados a registrar a los viajeros y a comunicar sus datos a las autoridades competentes conforme al **Real Decreto 933/2021** y normativa concordante. El Cliente se compromete a facilitar los datos identificativos necesarios (nombre, apellidos, documento de identidad o pasaporte, fecha de nacimiento y demás campos exigidos) de todos los ocupantes. La negativa a facilitarlos impide la prestación del servicio de alojamiento.

## 12. Notificaciones y comunicaciones

12.1. Las comunicaciones relativas a la reserva (confirmación, modificación, recordatorio, cancelación y reembolso) se envían por correo electrónico a la dirección asociada a la cuenta y se conservan además en la sección de notificaciones de ${COMPANY.accountDomain}.

12.2. El Cliente es responsable de mantener actualizada su dirección de correo y de revisar las carpetas de correo no deseado.

## 13. Responsabilidad

13.1. ${COMPANY.brand} responde del correcto funcionamiento del proceso de reserva y pago y de la gestión de la reserva en los términos de estas Condiciones.

13.2. En los alojamientos de terceros, la prestación material del servicio de alojamiento y su calidad corresponden al alojamiento; ${COMPANY.brand} asistirá al Cliente en la tramitación de incidencias y reclamaciones frente a aquel.

13.3. ${COMPANY.brand} no responde de los daños derivados de fuerza mayor, de la actuación de terceros ajenos a su organización, del uso indebido de la cuenta por el propio Cliente o de la indisponibilidad de servicios de terceros.

13.4. Ninguna limitación de responsabilidad prevista en estas Condiciones afecta a los derechos imperativos de los consumidores ni a la responsabilidad por dolo o culpa grave.

## 14. Reclamaciones y resolución de conflictos

14.1. El Cliente puede dirigir cualquier reclamación a ${COMPANY.supportEmail} o al ${COMPANY.phone}. ${COMPANY.brand} acusará recibo y responderá en el plazo máximo de un mes.

14.2. Los establecimientos disponen de hojas de reclamaciones oficiales conforme a la normativa de consumo de la comunidad autónoma correspondiente.

14.3. El Cliente consumidor puede acudir a la plataforma europea de resolución de litigios en línea: [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).

## 15. Protección de datos

El tratamiento de los datos personales facilitados se rige por la [Política de Privacidad](/legal/privacidad), que forma parte integrante de estas Condiciones.

## 16. Modificación de las Condiciones

${COMPANY.brand} podrá modificar estas Condiciones por razones legales, técnicas u operativas. La versión aplicable a cada reserva es la vigente y aceptada en el momento de la contratación, que se entrega al Cliente con la confirmación. Las modificaciones no afectan retroactivamente a reservas ya confirmadas.

## 17. Nulidad parcial

Si alguna cláusula fuera declarada nula o inaplicable, dicha declaración no afectará a la validez del resto, que seguirá siendo plenamente exigible.

## 18. Ley aplicable y jurisdicción

Estas Condiciones se rigen por la legislación española. Para los Clientes que actúen como consumidores serán competentes los juzgados de su domicilio; en el resto de casos, los juzgados y tribunales de Madrid capital.
`.trim();
