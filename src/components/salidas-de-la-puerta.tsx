import { Icon } from '@iconify/react';
import { getTranslations } from 'next-intl/server';

import { enlaceDelPortal } from '@/lib/anuncio-del-reparto';
import { DescargaDelApk } from '@/components/descarga-del-apk';

/**
 * LAS DOS SALIDAS DE LA PUERTA: bajarse la aplicación del reparto, e irse al portal.
 *
 * Jose, 24/09/2026:
 *
 * > «recuerda q tienes q poner en el login q puedan descargar la aplicación y
 * > entrar a procovar.cloud […] para q puedan descargar la apk y instalarla»
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
 * ## LAS DOS NO SE PARECEN EN NADA
 *
 *  * **El portal no depende de nadie.** Es una dirección que una persona pulsa. Se
 *    pinta aquí, en el servidor, y sale SIEMPRE: también el día que la api del
 *    reparto esté caída, y también si el navegador no ejecuta JavaScript.
 *  * **La descarga depende del anuncio del reparto** y por eso vive en su propio
 *    componente de navegador (`descarga-del-apk.tsx`): si no hay anuncio, no hay
 *    botón. Nunca un enlace muerto ni un botón apagado con una explicación.
 *
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
            <DescargaDelApk />

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
