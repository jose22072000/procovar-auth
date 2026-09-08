'use client';

import { Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { recargarLimpio, vigilarVersion } from '@/lib/version-nueva';

/** Cuánto se calla el aviso cuando alguien pulsa «Ahora no». */
const POSPUESTO = 30 * 60_000;

/**
 * «Hay una versión nueva — recarga».
 *
 * Va en Providers, fuera del árbol de rutas, para que salga en TODAS las pantallas
 * incluida la de entrar. Y no se puede quitar del todo: «Ahora no» lo calla media hora
 * y vuelve. Una ✕ definitiva lo convertiría en algo que se cierra sin leer el primer
 * día y ya nunca avisa de nada.
 */
export function AvisoVersionNueva() {
    const t = useTranslations('versionNueva');
    const [hayNueva, setHayNueva] = useState(false);

    useEffect(() => vigilarVersion(() => setHayNueva(true)), []);

    if (!hayNueva) return null;

    return (
        <div
            aria-live="polite"
            role="status"
            className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-warning-200 bg-warning-50 p-3 shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 dark:border-warning-500/30 dark:bg-warning-500/10"
        >
            <p className="text-sm font-semibold text-warning-700 dark:text-warning-400">
                {t('titulo')}
            </p>
            <p className="mt-1 text-xs text-default-600">{t('detalle')}</p>
            <div className="mt-3 flex gap-2">
                <Button color="warning" size="sm" onPress={() => recargarLimpio()}>
                    {t('recargar')}
                </Button>
                <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                        setHayNueva(false);
                        // Vuelve sola: el aviso no se puede quitar del todo, sólo aplazar.
                        setTimeout(() => setHayNueva(true), POSPUESTO);
                    }}
                >
                    {t('posponer')}
                </Button>
            </div>
        </div>
    );
}
