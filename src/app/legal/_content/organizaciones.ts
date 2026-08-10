import { COMPANY } from "@/lib/legal/company";

export const organizaciones = `
Estas condiciones regulan la relación entre ${COMPANY.brand} y las **organizaciones** (empresas propietarias o gestoras de alojamientos) que utilizan la Plataforma para comercializar y gestionar sus alojamientos. Complementan al [Aviso Legal](/legal/aviso-legal) y a las [Condiciones Generales de Contratación](/legal/condiciones).

## 1. Alta y cuentas de organización

1.1. El alta se realiza mediante una cuenta de organización a la que se vinculan usuarios (miembros) con roles y permisos diferenciados. Quien acepta estas condiciones declara tener poder de representación suficiente.

1.2. La organización es responsable de gestionar el alta y la baja de sus miembros, de asignar el nivel de permisos mínimo necesario y de revocar accesos cuando un miembro deja de estar autorizado.

1.3. Las credenciales y las claves de API generadas son personales e intransferibles. La organización responde de todo uso realizado con ellas y debe comunicar de inmediato cualquier compromiso de seguridad.

## 2. Servicios prestados por ${COMPANY.brand}

- Publicación y comercialización de los alojamientos en los canales de la Plataforma.
- Motor de reservas, gestión de disponibilidad y tarifas, y sincronización con el sistema de gestión hotelera o *channel manager* de la organización.
- Proceso de pago mediante el TPV Virtual contratado por ${COMPANY.brand}, con cobro en nombre y por cuenta de la organización en el caso de alojamientos de terceros.
- Gestión de reservas, modificaciones, cancelaciones y solicitudes de reembolso.
- Panel de gestión: propiedades, tipos de unidad, fotografías, tarifas, políticas de cancelación, reservas, facturación, liquidaciones, cupones y vales.
- Notificaciones automáticas a huéspedes y a la organización.

## 3. Obligaciones de la organización

3.1. **Legalidad del alojamiento.** Disponer de todas las licencias, registros turísticos, seguros y autorizaciones exigidos por la normativa estatal, autonómica y municipal, y mantenerlos vigentes, facilitando el número de registro turístico cuando la normativa exija su publicación.

3.2. **Exactitud de la información.** Mantener actualizados descripciones, fotografías, servicios, capacidad, precios, impuestos, suplementos y políticas de cancelación. Los precios publicados deben incluir los impuestos aplicables y ser correctos en el momento de la reserva.

3.3. **Cumplimiento de las reservas.** Respetar toda reserva confirmada en las condiciones publicadas. Las cancelaciones imputables a la organización dan derecho al huésped al reembolso íntegro o a una alternativa equivalente, cuyo coste asumirá la organización.

3.4. **Registro de viajeros.** Cumplir las obligaciones de registro y comunicación de datos de viajeros conforme al Real Decreto 933/2021 y normativa concordante.

3.5. **Protección de datos.** Tratar los datos de los huéspedes conforme al RGPD y a la LOPDGDD, exclusivamente para prestar el servicio de alojamiento y cumplir sus obligaciones legales, y no utilizarlos con fines de marketing propio sin base jurídica válida. Cada parte actúa como responsable independiente en el ámbito de su propia actividad.

3.6. **Contenidos.** La organización garantiza ser titular o estar autorizada para el uso de las fotografías y textos que publica, y concede a ${COMPANY.brand} una licencia no exclusiva, gratuita y limitada al ámbito de la Plataforma y de sus acciones de promoción, mientras dure la relación.

3.7. **Cupones y vales.** La organización es responsable del contenido, la validez y la financiación de los cupones y vales que emita, así como de la información facilitada a los huéspedes sobre sus condiciones y caducidad.

## 4. Comisiones, cobros y liquidaciones

4.1. ${COMPANY.brand} percibirá la retribución pactada: ${COMPANY.orgEconomicModel}.

4.2. Las cantidades cobradas a los huéspedes por cuenta de la organización se liquidan en la periodicidad pactada, deducidas las comisiones, los importes reembolsados y los cargos por reclamaciones de cargo.

4.3. La organización debe mantener actualizados sus datos fiscales y bancarios. ${COMPANY.brand} podrá retener una liquidación cuando existan reservas en disputa, indicios de fraude o datos fiscales incompletos, informando del motivo.

4.4. La organización es responsable del cumplimiento de sus obligaciones fiscales derivadas de la actividad, incluida la repercusión e ingreso de los impuestos indirectos que correspondan.

## 5. Uso de la API y de las integraciones

5.1. El acceso programático se realiza mediante claves de API vinculadas a la organización, con el alcance asignado.

5.2. Queda prohibido exceder los límites de uso razonables, revender el acceso, extraer masivamente datos de la Plataforma o utilizar la API para fines distintos de la gestión de los propios alojamientos.

5.3. ${COMPANY.brand} podrá aplicar límites de frecuencia, suspender claves comprometidas y modificar la API previo aviso razonable cuando ello no impida la continuidad del servicio.

## 6. Disponibilidad y soporte

${COMPANY.brand} empleará medios razonables para mantener el servicio disponible, pudiendo realizar mantenimientos programados con preaviso siempre que sea posible.

## 7. Suspensión y resolución

7.1. ${COMPANY.brand} podrá suspender el acceso, total o parcialmente, en caso de incumplimiento grave de estas condiciones, falta de licencias, información sistemáticamente inexacta, riesgo para la seguridad de la Plataforma o indicios fundados de fraude.

7.2. Cualquiera de las partes podrá resolver la relación con un preaviso de ${COMPANY.orgTerminationNotice}. La resolución no afecta a las reservas ya confirmadas, que deberán cumplirse, ni a las liquidaciones pendientes.

## 8. Responsabilidad

8.1. La organización responde frente a los huéspedes y frente a ${COMPANY.brand} de la prestación material del alojamiento, de la legalidad de su actividad y de la exactitud de la información publicada, y mantendrá indemne a ${COMPANY.brand} frente a reclamaciones derivadas de dichos incumplimientos.

8.2. ${COMPANY.brand} responde de la correcta prestación de los servicios tecnológicos descritos en la cláusula 2, quedando excluida la responsabilidad por lucro cesante y por daños indirectos, salvo dolo o culpa grave.

## 9. Confidencialidad

Las partes mantendrán la confidencialidad de la información técnica, comercial y económica intercambiada, durante la relación y los dos años siguientes a su finalización.

## 10. Ley aplicable y jurisdicción

Estas condiciones se rigen por la legislación española. Las partes, que actúan en el marco de su actividad empresarial, se someten a los juzgados y tribunales de Madrid capital, con renuncia expresa a cualquier otro fuero.
`.trim();
