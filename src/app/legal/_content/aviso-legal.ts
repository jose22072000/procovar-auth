import { COMPANY, COMPANY_ADDRESS } from "@/lib/legal/company";

export const avisoLegal = `
## 1. Datos identificativos del prestador de servicios

En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se hacen constar los siguientes datos:

| Dato | Valor |
|---|---|
| Denominación social | ${COMPANY.legalName} |
| N.I.F. / C.I.F. | ${COMPANY.taxId} |
| Domicilio social | ${COMPANY_ADDRESS} |
| Datos registrales | ${COMPANY.registryData} |
| Correo electrónico de contacto | ${COMPANY.supportEmail} |
| Teléfono de atención | ${COMPANY.phone} |
| Nombre comercial | ${COMPANY.brand} |
| Actividad | Explotación y comercialización de alojamientos turísticos e intermediación en la reserva de alojamiento |
| Número de registro turístico | Se indica en la ficha de cada alojamiento cuando la normativa autonómica lo exige |

Este Aviso Legal es accesible de forma permanente, gratuita y a un solo clic desde el pie de página de todas las páginas de la Plataforma, incluida la página de pago.

## 2. Objeto y ámbito

La Plataforma ${COMPANY.brand} está formada por varios servicios que se prestan bajo dominios distintos pero constituyen un único servicio integrado:

| Dominio | Función |
|---|---|
| ${COMPANY.bookingDomain} | Portal público: búsqueda, consulta y selección de alojamientos. |
| ${COMPANY.accountDomain} | Centro de cuenta e identidad única (SSO), proceso de pago (checkout), gestión de reservas, facturas, métodos de pago guardados, vales y cancelaciones. |
| ${COMPANY.panelDomain} | Panel privado para organizaciones y propietarios de alojamientos. |

El acceso a la Plataforma atribuye la condición de usuario e implica la aceptación de este Aviso Legal, de las [Condiciones Generales de Contratación](/legal/condiciones), de la [Política de Privacidad](/legal/privacidad) y de la [Política de Cookies](/legal/cookies).

## 3. Condiciones de uso

3.1. El usuario se compromete a hacer un uso diligente y lícito de la Plataforma y a no emplearla para actividades contrarias a la ley, la moral, el orden público o estas condiciones.

3.2. Queda prohibido, con carácter enunciativo y no limitativo: (i) acceder o intentar acceder a áreas restringidas o a cuentas ajenas; (ii) realizar ingeniería inversa, extracción masiva de contenidos o pruebas de intrusión no autorizadas; (iii) introducir código malicioso; (iv) suplantar la identidad de terceros; (v) utilizar medios de pago de los que no se sea titular legítimo.

3.3. El Titular podrá suspender o cancelar el acceso de cualquier usuario que incumpla lo anterior, sin perjuicio de las acciones legales que procedan.

## 4. Propiedad intelectual e industrial

Todos los contenidos de la Plataforma —textos, marcas, logotipos, imágenes, fotografías, diseño, estructura de navegación, bases de datos y código fuente— son titularidad de ${COMPANY.legalName} o de terceros que han autorizado su uso, y están protegidos por la normativa de propiedad intelectual e industrial. No se cede al usuario ningún derecho de explotación sobre los mismos más allá del estrictamente necesario para el uso del servicio.

## 5. Responsabilidad

5.1. El Titular emplea medios razonables para que la información publicada (disponibilidad, precios, descripciones, fotografías y servicios de cada alojamiento) sea exacta y esté actualizada. Parte de esa información procede de los sistemas de gestión hotelera de los alojamientos, por lo que pueden producirse desajustes puntuales; en caso de discrepancia prevalecerá la confirmación de reserva emitida.

5.2. El Titular no garantiza la disponibilidad ininterrumpida de la Plataforma ni responde de interrupciones debidas a causas de fuerza mayor, mantenimiento, fallos de proveedores de comunicaciones, de la pasarela de pago o del sistema del alojamiento.

5.3. El Titular no responde de los contenidos alojados en sitios de terceros a los que pueda enlazarse desde la Plataforma.

5.4. Ninguna cláusula de este Aviso Legal limita los derechos que la normativa de consumo reconoce con carácter imperativo a los usuarios que actúen como consumidores.

## 6. Legislación aplicable y resolución de conflictos

6.1. Este Aviso Legal se rige por la legislación española.

6.2. Cuando el usuario actúe como consumidor, serán competentes los juzgados y tribunales de su domicilio, conforme a la normativa de consumo. En los demás casos, las partes se someten a los juzgados y tribunales de Madrid capital, con renuncia a cualquier otro fuero.

6.3. Conforme al Reglamento (UE) 524/2013, se informa de la existencia de la plataforma europea de resolución de litigios en línea: [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).

## 7. Contacto

**${COMPANY.legalName}** — ${COMPANY_ADDRESS} · ${COMPANY.supportEmail} · ${COMPANY.phone}
`.trim();
