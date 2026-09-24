/**
 * GET /api/reparto/descarga — qué hay colgado del reparto para bajarse.
 *
 * Lo pregunta la pantalla de entrada, después de pintarse, para ofrecer el APK sin
 * que el login dependa de que la api del reparto esté arriba. El porqué entero —de
 * dónde sale, por qué no se pide desde el navegador de quien mira y por qué no se
 * resuelve durante el render— está en `@/lib/anuncio-del-reparto`.
 *
 * **SIN SESIÓN, y tiene que ser así**: se pregunta desde la pantalla de entrar, que
 * es justo donde todavía no hay ninguna. No devuelve nada de nadie: sólo repite la
 * versión pública y su enlace, que la api del reparto ya sirve abierta.
 *
 * Contesta `{"oferta": null}` cuando no hay nada que ofrecer, y **200 igual**. Ni un
 * 404 ni un 503, a propósito: que no haya nada colgado es el estado normal de este
 * endpoint y no es ningún fallo que contar, y un error aquí saldría pintado en rojo
 * en la consola del navegador de todo el que entra a la casa.
 */
import { NextResponse } from 'next/server';

import { ofertaDeLaPuerta } from '@/lib/anuncio-del-reparto';

export const dynamic = 'force-dynamic';

export async function GET() {
    const oferta = await ofertaDeLaPuerta();

    return NextResponse.json(
        { oferta },
        {
            headers: {
                // Que el navegador lo guarde un rato está bien —el anuncio cambia
                // cuando se publica una versión— pero no más que nuestro propio
                // caché, o una versión nueva tardaría en verse aquí sin que nada
                // lo explicara.
                'Cache-Control': 'public, max-age=300',
            },
        },
    );
}
