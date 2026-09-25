import { Icon } from '@iconify/react';
import { getTranslations } from 'next-intl/server';

import { enlaceDelPortal } from '@/lib/anuncio-del-reparto';

/**
 * LA SALIDA DE LA PUERTA: irse al portal.
 *
 * ## AQUÍ NO SE OFRECE LA APK DEL REPARTO, Y ES A PROPÓSITO
 *
 * Se puso el 24/09/2026 y se quitó el 25/09/2026, y el motivo es el que se ve en
 * esta misma pantalla: por esta puerta entra TODA la casa —PEDIDO, Analitics,
 * Rutas, Delivery, Entrega, Caja, Traslado y Parranda—, así que ofrecer aquí la
 * aplicación de los repartidores es ponérsela delante a un contable que viene a
 * abrir Caja. Jose, viéndolo:
 *
 * > «por qué en auth me pones a descargar, si eso va para el login de Reparto»
 *
 * La descarga vive donde tiene sentido: en la puerta del PROPIO reparto
 * (`delivery-logistica/app/lib/pantallas/acceso/datos/oferta_de_la_puerta.dart`),
 * que es la que ve quien viene a repartir.
 *
 * ## DÓNDE VA, Y POR QUÉ NO ESTORBA
 *
 * **Debajo del formulario y separado por una línea.** Quien llega aquí viene a
 * entrar: el formulario manda y esto es lo segundo. Por eso no hay ningún botón
 * relleno —el único relleno de la pantalla es «Entrar»—, el de la descarga va sólo
 * perfilado y el del portal es texto.
 *
 * Y **todo cuelga por debajo de «Entrar»**, que es lo que permite que la descarga
 * aparezca tarde (la pide el navegador cuando la página ya está pintada) sin mover
 * nada bajo el dedo de quien iba a pulsar.
 *
 * ## EL PORTAL NO DEPENDE DE NADIE
 *
 *  * Es lo que permite que esto Es una dirección que una persona pulsa. Se
 *    pinta aquí, en el servidor, y sale SIEMPRE: también el día que la api del
 *    reparto esté caída, y también si el navegador no ejecuta JavaScript.
 * Esta pantalla es la puerta de TODAS las aplicaciones de la casa —aquí llegan
 * redirigidos el reparto, PEDIDO, Analítica, Caja y Rutas—, así que la regla dura
 * es que nada de esto pueda retrasar ni romper una entrada. El porqué entero, y por
 * qué se le pregunta al reparto desde nuestro servidor y no desde el navegador,
 * está en `@/lib/anuncio-del-reparto`.
 */
export async function SalidasDeLaPuerta() {
    const t = await getTranslations('entrada.salidas');

    return (
        <div className="mt-7 border-t border-pv-trazo-tenue pt-5">
            <a
                href={enlaceDelPortal()}
                className="pv-toque inline-flex items-center gap-2 text-sm font-semibold text-pv-azul underline underline-offset-4"
            >
                <Icon icon="lucide:external-link" className="size-4 shrink-0" aria-hidden />
                {t('portal')}
            </a>
            <p className="mt-2 text-xs text-pv-tinta-suave">{t('detallePortal')}</p>
        </div>
    );
}
