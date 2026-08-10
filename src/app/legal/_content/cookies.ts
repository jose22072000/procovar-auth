import { COMPANY } from "@/lib/legal/company";

export const cookies = `
## 1. Qué es una cookie

Una cookie es un pequeño archivo que un sitio web almacena en el navegador del usuario y que permite recordar información sobre su visita. Se emplean también tecnologías equivalentes de almacenamiento local.

## 2. Cookies utilizadas en ${COMPANY.accountDomain}

En el centro de cuenta y pago utilizamos **exclusivamente cookies técnicas o estrictamente necesarias**, imprescindibles para la prestación del servicio expresamente solicitado por el usuario (artículo 22.2 LSSI-CE), por lo que no requieren consentimiento previo:

| Cookie o almacenamiento | Titular | Finalidad | Duración |
|---|---|---|---|
| \`qb.session_token\` / \`__Secure-qb.session_token\` | Propia | Mantener la sesión iniciada y el inicio de sesión único (SSO) entre los servicios de ${COMPANY.brand} | Duración configurada de la sesión |
| \`qb.flow_state\` | Propia | Recordar en qué punto del proceso (reserva, paso del checkout, origen del inicio de sesión) debe continuar el usuario tras autenticarse | 1 hora |
| \`qb.profile\` | Propia | Conservar preferencias mínimas de presentación del perfil | Sesión |
| \`NEXT_LOCALE\` | Propia | Recordar el idioma seleccionado | 1 año |
| Preferencia de tema (almacenamiento local) | Propia | Recordar el modo claro u oscuro | Hasta su borrado |
| Cookies de la pasarela de pago | Redsys y entidad adquirente | Ejecutar la autorización del pago y la autenticación 3D Secure dentro del formulario alojado por Redsys | Según el proveedor |
| Cookies de seguridad de red | Cloudflare | Mitigación de ataques, filtrado de tráfico malicioso y balanceo | Según el proveedor |

**No utilizamos cookies analíticas, publicitarias ni de perfilado en ${COMPANY.accountDomain}.** Si en el futuro se incorporasen, se solicitará el consentimiento previo mediante un panel de configuración con opciones de aceptar, rechazar y personalizar en igualdad de condiciones, y esta Política se actualizará antes de su activación.

## 3. Cómo gestionar las cookies

El usuario puede permitir, bloquear o eliminar las cookies desde la configuración de su navegador:

- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/es/kb/Borrar%20cookies)
- [Safari](https://support.apple.com/es-es/guide/safari/sfri11471/mac)
- [Microsoft Edge](https://support.microsoft.com/es-es/microsoft-edge)

El bloqueo de las cookies técnicas impide iniciar sesión y completar el proceso de pago, ya que la sesión no puede mantenerse entre pasos.

## 4. Tratamiento de datos personales

La información obtenida a través de cookies técnicas se trata conforme a la [Política de Privacidad](/legal/privacidad), donde figuran también los canales para ejercer los derechos reconocidos por el RGPD.

## 5. Actualizaciones

Esta Política puede actualizarse cuando cambien las cookies utilizadas o la normativa aplicable. La versión vigente es la publicada en esta dirección, con indicación de su fecha.
`.trim();
