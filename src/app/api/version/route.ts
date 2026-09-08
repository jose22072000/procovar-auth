import { NextResponse } from 'next/server';

/**
 * GET /api/version — la versión que sirve ESTE contenedor.
 *
 * `process.env.VERSION_APP` no se lee en ejecución: Next lo sustituye por un literal al
 * compilar (está declarado en `env` de next.config.ts). Por eso sirve para lo que
 * sirve — el JavaScript que corre en el navegador lleva incrustado el literal del build
 * del que salió, y esto devuelve el del build desplegado ahora. Distintos = esa pestaña
 * tiene una versión vieja.
 *
 * Aparte de /api/health a propósito: health comprueba Redis y la base y puede contestar
 * 503, y entonces se perdería justo el dato que hay que leer siempre.
 */
export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json(
        { version: process.env.VERSION_APP ?? null },
        { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
    );
}
