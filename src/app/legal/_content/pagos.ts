import { COMPANY } from "@/lib/legal/company";

export const pagos = `
Este documento describe cómo se cobran las reservas, qué garantías de seguridad se aplican y cómo se tratan las tarjetas guardadas. Forma parte de las [Condiciones Generales de Contratación](/legal/condiciones).

## 1. Divisa y precios

Todos los importes se muestran y se cobran en **euros (EUR)**, salvo indicación expresa en contrario en el propio proceso de reserva. El importe total mostrado junto al botón de pago incluye los impuestos aplicables y es el importe exacto que se cargará en el medio de pago.

## 2. Medios de pago admitidos

| Medio | Detalle |
|---|---|
| Tarjeta de crédito o débito | Visa, Mastercard y demás marcas admitidas por nuestra entidad adquirente |
| Tarjeta guardada | Tarjeta del propio usuario registrada previamente como credencial en archivo |
| Otros proveedores | Proveedores adicionales habilitados puntualmente e identificados en el proceso de pago |
| Vales y cupones | Crédito o descuento aplicable según la cláusula 7 de las [Condiciones Generales](/legal/condiciones) |

Los logotipos de las marcas de tarjeta admitidas y de la pasarela se muestran en el paso de pago.

## 3. Procesamiento del pago

3.1. Los pagos con tarjeta se procesan a través del **TPV Virtual de Redsys** contratado con nuestra entidad adquirente, en dos modalidades de integración:

- **Página segura de Redsys:** el usuario es dirigido al entorno de Redsys para introducir los datos de la tarjeta.
- **InSite (pago integrado):** los campos de tarjeta se muestran dentro de nuestra página de pago mediante un formulario alojado y cifrado por Redsys. Los datos de la tarjeta viajan directamente a Redsys; nuestros servidores no los reciben ni pueden leerlos, y nuestra página solo recibe un identificador de operación.

3.2. La confirmación del pago es la notificación en línea que Redsys envía a nuestro servidor, verificada mediante firma criptográfica. Esa notificación es la única fuente válida del resultado: el mensaje mostrado en pantalla es informativo.

3.3. **Momento del cargo.** Salvo que la tarifa indique lo contrario, el cargo se realiza al confirmar la reserva. La reserva no queda confirmada hasta que la autorización es aceptada.

3.4. **Concepto en el extracto bancario.** El cargo figurará con el identificador ${COMPANY.cardDescriptor}.

3.5. **Pagos no completados.** Si la operación es denegada, cancelada o expira, no se genera cargo y la disponibilidad retenida se libera. Si se detectase un cargo sin reserva confirmada, se devolverá íntegramente tras la conciliación.

## 4. Autenticación reforzada (SCA / 3D Secure)

Conforme a la Directiva (UE) 2015/2366 (PSD2) y al Reglamento Delegado (UE) 2018/389, las operaciones están sujetas a autenticación reforzada del cliente. La entidad emisora puede solicitar una verificación adicional mediante su aplicación bancaria, biometría o código de un solo uso. Esta autenticación se realiza entre el usuario y su banco; ${COMPANY.brand} no la gestiona, no la puede omitir y no accede a las credenciales utilizadas.

## 5. Seguridad de los datos de tarjeta

5.1. Todas las páginas de la Plataforma, y en particular la de pago, se sirven exclusivamente sobre HTTPS con TLS.

5.2. **${COMPANY.brand} no almacena, no procesa y no transmite el número completo de tarjeta (PAN) ni el código de seguridad (CVV).** La captura se realiza siempre en componentes alojados por Redsys.

5.3. Al utilizar campos alojados por el proveedor de pago, el comercio se sitúa en el ámbito de cumplimiento PCI DSS correspondiente a integraciones de tipo *hosted fields* o redirección.

5.4. Las comunicaciones entre nuestros propios servicios están autenticadas y firmadas (HMAC-SHA256) con claves derivadas por cliente y rotables; los tokens de tarjeta nunca se envían al navegador.

5.5. Cada operación queda registrada con su número de pedido, importe, resultado y sello de tiempo, para su conciliación con la entidad adquirente.

## 6. Tarjetas guardadas (credencial en archivo)

6.1. El usuario puede optar voluntariamente por guardar su tarjeta para futuras reservas. Esta opción no está premarcada y requiere su consentimiento expreso.

6.2. Al guardarla, Redsys emite un token (referencia opaca) que sustituye al número de tarjeta. ${COMPANY.brand} conserva únicamente: token, identificador de la operación de registro, marca, cuatro últimos dígitos y mes y año de caducidad. Con esos datos no es posible reconstruir el número de tarjeta ni utilizarla fuera de nuestro comercio.

6.3. Las tarjetas guardadas están vinculadas a la cuenta del usuario y solo pueden ser utilizadas por él, desde su sesión autenticada, y siempre para pagos iniciados por él mismo en el momento de la reserva.

6.4. El usuario puede eliminar una tarjeta guardada en cualquier momento desde ${COMPANY.accountDomain}, sección «Métodos de pago». La eliminación es inmediata y no afecta a los pagos ya autorizados.

6.5. Los cargos sobre tarjetas guardadas se realizan conforme a las reglas de las marcas y de Redsys para operaciones con credencial en archivo, aplicando la autenticación reforzada cuando la entidad emisora la requiera.

## 7. Devoluciones y reembolsos

7.1. Los reembolsos se realizan siempre al mismo medio de pago utilizado en la compra. No se efectúan devoluciones en efectivo ni a tarjetas de terceros.

7.2. El plazo de abono depende de la entidad emisora, habitualmente entre 5 y 10 días hábiles desde que se ordena la devolución.

7.3. El cálculo del importe reembolsable se rige por la [Política de Cancelaciones y Reembolsos](/legal/cancelaciones).

## 8. Prevención del fraude y reclamaciones de cargo

8.1. ${COMPANY.brand} y su entidad adquirente aplican controles antifraude. Podrán rechazarse o anularse operaciones con indicios razonables de uso no autorizado del medio de pago.

8.2. Si el usuario no reconoce un cargo, recomendamos contactar primero con nosotros en ${COMPANY.supportEmail} o en el ${COMPANY.phone}: la mayoría de incidencias se resuelven de forma inmediata identificando la reserva. Sin perjuicio de ello, conserva íntegros sus derechos frente a su entidad emisora conforme a la normativa de servicios de pago.

8.3. En caso de reclamación de cargo, ${COMPANY.brand} aportará a la entidad la documentación de la reserva, la aceptación de condiciones y el resultado de la autenticación.

## 9. Justificantes y facturas

Cada pago genera un justificante disponible en ${COMPANY.accountDomain}, sección «Facturas», descargable en cualquier momento, junto con el correo de confirmación de la reserva.

## 10. Incidencias técnicas

Si el proceso de pago se interrumpe (caída de conexión o cierre del navegador), el usuario debe comprobar el estado de la reserva en su cuenta antes de repetir el pago, para evitar cargos duplicados. Ante cualquier duplicidad, contacte con nosotros: se devolverá el importe duplicado sin coste.
`.trim();
