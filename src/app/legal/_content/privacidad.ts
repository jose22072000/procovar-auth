import { COMPANY, COMPANY_ADDRESS, PROCESSORS } from "@/lib/legal/company";

const processorRows = PROCESSORS.map((p) => `| ${p.name} | ${p.role} | ${p.location} |`).join("\n");

export const privacidad = `
Esta Política explica cómo tratamos los datos personales de huéspedes, usuarios registrados, propietarios y miembros de organizaciones, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).

## 1. Responsable del tratamiento

| Dato | Valor |
|---|---|
| Responsable | ${COMPANY.legalName} |
| C.I.F. | ${COMPANY.taxId} |
| Domicilio | ${COMPANY_ADDRESS} |
| Correo de privacidad | ${COMPANY.privacyEmail} |
| Teléfono | ${COMPANY.phone} |
| Delegado de Protección de Datos | ${COMPANY.dpoContact} |

Cuando la reserva corresponde a un alojamiento de un tercero, el titular de dicho alojamiento trata los datos de la estancia como responsable independiente para prestar el servicio y cumplir sus obligaciones legales (registro de viajeros, facturación).

## 2. Datos que tratamos

**2.1. Datos de cuenta e identidad.** Nombre y apellidos, correo electrónico, contraseña (almacenada siempre cifrada mediante función de derivación de clave, nunca en claro), teléfono, nacionalidad, dirección postal y número de documento de identidad o pasaporte cuando el usuario lo aporta; imagen de perfil e idioma; estado de verificación del correo.

**2.2. Datos de sesión y seguridad.** Identificadores de sesión, fecha y hora de inicio y cierre, dirección IP, agente de usuario, eventos de inicio de sesión y revocación, y claves de API generadas por el usuario.

**2.3. Datos de reserva.** Alojamiento, fechas de entrada y salida, unidades y ocupación (incluidas edades de menores cuando procede), régimen y tarifa, peticiones especiales, servicios adicionales contratados, localizador, estado de la reserva y su historial.

**2.4. Datos de pago.** Importe, divisa, número de pedido y de operación, resultado de la autorización, medio de pago empleado y —si el usuario decide guardar la tarjeta— el token emitido por Redsys junto con la marca, los cuatro últimos dígitos y el mes y año de caducidad. **No tratamos ni almacenamos el número completo de la tarjeta ni el código de seguridad (CVV)**: esos datos se introducen directamente en un formulario alojado por Redsys.

**2.5. Datos de facturación.** Datos fiscales necesarios para emitir factura, importes, impuestos, vales y cupones aplicados.

**2.6. Datos de organizaciones y propietarios.** Datos de contacto de los miembros, rol y permisos asignados, alojamientos gestionados, liquidaciones y datos bancarios o fiscales necesarios para el pago de dichas liquidaciones.

**2.7. Comunicaciones.** Contenido de las notificaciones enviadas y de las consultas remitidas a atención al cliente.

**2.8. Datos técnicos.** Cookies estrictamente necesarias y registros técnicos de la aplicación. Véase la [Política de Cookies](/legal/cookies).

No solicitamos categorías especiales de datos. Si el usuario los incluye voluntariamente en el campo de peticiones especiales (por ejemplo, necesidades de accesibilidad o alimentarias), se tratarán únicamente para atender esa petición, con base en su consentimiento explícito.

## 3. Finalidades y bases jurídicas

| Finalidad | Base jurídica (art. 6 RGPD) | Conservación |
|---|---|---|
| Crear y mantener la cuenta e identidad única (SSO) | Ejecución del contrato (6.1.b) | Mientras la cuenta esté activa, más los plazos de prescripción |
| Gestionar la pre-reserva, la reserva y su comunicación al alojamiento | Ejecución del contrato (6.1.b) | Duración de la relación más 6 años (art. 30 C. de Comercio) |
| Procesar el pago y prevenir el fraude | Ejecución del contrato (6.1.b) e interés legítimo (6.1.f) | Hasta 10 años cuando resulte aplicable la Ley 10/2010 |
| Guardar una tarjeta para pagos futuros | Consentimiento (6.1.a), revocable en cualquier momento | Hasta que el usuario la elimine o caduque |
| Emitir facturas y cumplir obligaciones fiscales y contables | Obligación legal (6.1.c) | 4 años (LGT) y 6 años (C. de Comercio) |
| Registro de viajeros y comunicación a las autoridades (RD 933/2021) | Obligación legal (6.1.c) | Plazo legalmente establecido |
| Notificaciones transaccionales por correo | Ejecución del contrato (6.1.b) | Mientras exista la reserva más prescripción |
| Comunicaciones comerciales sobre nuestros servicios | Consentimiento (6.1.a) o interés legítimo por relación previa (art. 21.2 LSSI) | Hasta la baja o revocación |
| Seguridad de la plataforma, registro de accesos y auditoría | Interés legítimo (6.1.f) y obligación legal | 12 meses los registros técnicos, salvo incidencia |
| Atención de consultas y reclamaciones | Ejecución del contrato e interés legítimo | 3 años desde su resolución |
| Gestión de organizaciones, permisos y liquidaciones | Ejecución del contrato (6.1.b) y obligación legal | 6 años |

No adoptamos decisiones automatizadas con efectos jurídicos significativos. Los controles antifraude asociados al pago los ejecutan la entidad emisora y la pasarela; cualquier denegación puede ser revisada contactando con nosotros.

## 4. Destinatarios de los datos

Comunicamos datos, únicamente en la medida necesaria, a los siguientes proveedores y destinatarios:

| Destinatario | Finalidad | Ubicación |
|---|---|---|
${processorRows}

Además, cuando corresponda: a los **alojamientos y organizaciones** en los que se realiza la reserva, como responsables independientes; a **otros proveedores de pago** activados puntualmente e identificados en el proceso de pago; a **administraciones públicas, fuerzas y cuerpos de seguridad, juzgados y entidades financieras** cuando exista obligación legal; y a **asesores profesionales** sujetos a deber de confidencialidad.

No vendemos ni cedemos datos personales con fines publicitarios de terceros.

## 5. Transferencias internacionales

Nuestra infraestructura principal se ubica en el Espacio Económico Europeo. Algunos proveedores tecnológicos pueden tratar datos fuera del EEE; en tal caso la transferencia se ampara en una decisión de adecuación o en cláusulas contractuales tipo aprobadas por la Comisión Europea, junto con las medidas adicionales que resulten necesarias.

## 6. Plazos de conservación

Conservamos cada categoría de datos durante el plazo indicado en la cláusula 3. Finalizados esos plazos, los datos se suprimen o se anonimizan de forma irreversible. Los datos bloqueados por prescripción de responsabilidades quedan a disposición exclusiva de jueces, tribunales y administraciones competentes.

## 7. Derechos de las personas interesadas

Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento, portabilidad y a no ser objeto de decisiones automatizadas, así como retirar el consentimiento prestado, escribiendo a ${COMPANY.privacyEmail} o a la dirección postal del responsable, indicando el derecho ejercido y adjuntando copia de un documento identificativo.

Acciones disponibles directamente en la Plataforma:

- Consultar y modificar los datos de perfil.
- Consultar reservas, facturas y notificaciones.
- Eliminar tarjetas guardadas (revocación inmediata del token, sin efecto sobre pagos ya autorizados).
- Cerrar sesiones activas y revocar claves de API.
- Solicitar la baja de la cuenta.

Responderemos en el plazo máximo de un mes, prorrogable dos meses en casos complejos. Si considera que sus derechos no han sido debidamente atendidos, puede reclamar ante la **Agencia Española de Protección de Datos** (C/ Jorge Juan 6, 28001 Madrid — [aepd.es](https://www.aepd.es)).

## 8. Medidas de seguridad

Aplicamos medidas técnicas y organizativas apropiadas al riesgo, entre otras:

- Cifrado en tránsito mediante TLS en todas las páginas, incluido el proceso de pago.
- Contraseñas almacenadas mediante funciones de derivación de clave con sal; nunca en claro.
- Ningún dato completo de tarjeta en nuestros sistemas: la captura se realiza en un formulario alojado por Redsys y solo conservamos un token y datos enmascarados. Los tokens se tratan como secreto, no se exponen al navegador y solo viajan entre nuestros servidores mediante canales autenticados con firma HMAC.
- Autenticación de servicio a servicio con claves firmadas y rotación de claves.
- Control de acceso por roles y permisos y separación de entornos.
- Registro de eventos de seguridad y revisión periódica de accesos.
- Copias de seguridad y procedimientos de recuperación.

En caso de violación de seguridad que suponga alto riesgo para los derechos de los interesados, lo notificaremos a la AEPD en 72 horas y a las personas afectadas sin dilación indebida.

## 9. Menores de edad

Los servicios se dirigen a mayores de 18 años. Los datos de menores solo se tratan como acompañantes de una reserva y bajo la responsabilidad del adulto contratante.

## 10. Cambios en esta Política

Podemos actualizar esta Política para adaptarla a cambios legales o de servicio. Publicaremos la versión vigente en esta dirección, indicando su fecha; los cambios sustanciales se comunicarán por correo electrónico a los usuarios registrados.
`.trim();
