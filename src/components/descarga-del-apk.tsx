'use client';

import { Icon } from '@iconify/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import {
    queSeEnsenaDeLaDescarga,
    type DescargaQueSeEnsena,
    type OfertaDeLaPuerta,
} from '@/lib/oferta-de-la-puerta';

/**
 * EL BOTÓN DE BAJARSE LA APLICACIÓN DEL REPARTO, debajo del formulario.
 *
 * Pregunta a `/api/reparto/descarga` **después** de que la página esté pintada, y
 * no durante el render. Así el HTML del login sale entero sin haber hablado con la
 * api del reparto: una aplicación de la casa caída no puede retrasar ni un
 * milisegundo la entrada a las otras seis. El porqué entero está en
 * `@/lib/anuncio-del-reparto`.
 *
 * **SIN ANUNCIO NO HAY BOTÓN.** Mientras la pregunta está en vuelo no se pinta
 * nada, y si falló tampoco: ni botón apagado, ni «ahora mismo no se puede», ni
 * hueco reservado. Nadie llegó a esta pantalla a descargarse nada, llegó a entrar a
 * trabajar, y un cartel que explica que algo que no habías pedido no está
 * disponible es ruido en la puerta de toda la casa.
 *
 * Nada de esto puede mover el formulario: todo cuelga por DEBAJO de «Entrar», así
 * que cuando la respuesta llega y aparece el botón, nada se mueve bajo el dedo de
 * quien iba a pulsar.
 *
 * Qué se enseña lo decide `queSeEnsenaDeLaDescarga`, que es una función pura y
 * tiene sus pruebas: aquí sólo se pinta lo que diga.
 */
export function DescargaDelApk() {
    const t = useTranslations('entrada.salidas');
    const [sale, setSale] = useState<DescargaQueSeEnsena | null>(null);

    useEffect(() => {
        let vivo = true;

        fetch('/api/reparto/descarga', { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : null))
            .then((cuerpo: { oferta?: OfertaDeLaPuerta | null } | null) => {
                if (vivo) setSale(queSeEnsenaDeLaDescarga(cuerpo?.oferta));
            })
            // Nuestra propia api tampoco puede tumbar esta pantalla. Si no se sabe,
            // no se enseña.
            .catch(() => undefined);

        return () => {
            vivo = false;
        };
    }, []);

    if (!sale) return null;

    return (
        <div className="mb-5">
            <a
                href={sale.enlace}
                className="pv-toque flex w-full items-center justify-center gap-2 border border-pv-azul px-4 py-2.5 text-sm font-semibold text-pv-azul hover:bg-pv-azul-tinte"
            >
                <Icon icon="lucide:download" className="size-4 shrink-0" aria-hidden />
                {t(sale.claveBoton, { tamano: sale.tamano ?? '' })}
            </a>
            <p className="mt-2 text-xs text-pv-tinta-suave">
                {t('detalleDescarga', { version: sale.version })}
            </p>
            {sale.avisarSinTamano && (
                <p className="mt-1 text-xs text-pv-tinta-suave">{t('sinTamano')}</p>
            )}
        </div>
    );
}
