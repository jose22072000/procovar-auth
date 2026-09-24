/**
 * PREGUNTARLE AL REPARTO QUÉ HAY COLGADO, desde el servidor de Accesos.
 *
 * Lo que se ofrece y cómo se lee el anuncio está en `oferta-de-la-puerta.ts`; aquí
 * sólo está la llamada, su caché y el enlace del portal. Separado porque esto
 * arrastra el registro (Node) y aquello lo comparte el navegador.
 *
 * ## DÓNDE SE PIDE EL ANUNCIO, Y POR QUÉ DESDE AQUÍ
 *
 * Desde **el servidor de Accesos**, no desde el navegador de quien mira. El
 * navegador se lo pide a `/api/reparto/descarga`, que es nuestro, y nosotros
 * llamamos al reparto. Tres motivos, por orden de importancia:
 *
 *  1. **El navegador no puede.** `reparto.procovar.cloud` es otro origen: una
 *     llamada desde `auth.procovar.cloud` necesita que la api del reparto conteste
 *     con CORS para este dominio, y eso no es nuestro ni está garantizado. Lo que
 *     no se puede es dejar una salida de la puerta colgando de una cabecera que
 *     mantiene otro.
 *  2. **La conexión de allá.** Quien está delante del formulario suele estar en
 *     una red lenta y con pérdidas; una llamada suya más, a otro dominio, con otro
 *     DNS y otro TLS, es tiempo que se le va. Desde el servidor la api del reparto
 *     está en la MISMA máquina —por eso `REPARTO_API_URL` se apunta al appName
 *     interno en Dokploy— y no da la vuelta por Cloudflare.
 *  3. **Se pregunta una vez para todos.** Diez personas entrando a las siete de la
 *     mañana son diez llamadas a la api del reparto; con el caché de aquí, una.
 *
 * ## POR QUÉ NO SE PIDE MIENTRAS SE PINTA LA PÁGINA
 *
 * Porque **la entrada a todas las aplicaciones de la casa no puede depender de que
 * una de ellas esté arriba**. Si esto se resolviera dentro del render, una api del
 * reparto que acepta la conexión y luego no contesta se convertiría en segundos de
 * espera para cualquiera que venga a entrar a PEDIDO, a Caja o a Analítica, que no
 * tienen nada que ver con el reparto. El HTML del login sale entero y cerrado sin
 * haber preguntado nada; la oferta la pide después el navegador, a nosotros, y si
 * no llega no se pinta nada.
 */

import { logger } from '@/lib/logger';
import { leerElAnuncio, type OfertaDeLaPuerta } from '@/lib/oferta-de-la-puerta';

/**
 * La api del reparto. **En variable de entorno, con valor por defecto**, como
 * `TASA_CAMBIO_URL` en `tasa-cambio.ts`: el dominio público vale y funciona, pero
 * en el servidor Dokploy la apunta al appName interno
 * (`http://reparto-api-xxxxxx:8080`), que es la misma máquina.
 *
 * El defecto es el dominio público y **no** el appName porque el sufijo que le pone
 * Dokploy cambia cuando se rehace la Application: un defecto que no resuelve no
 * sirve de defecto.
 *
 * Se lee dentro de la función y no al cargar el módulo para que se pueda probar sin
 * recargar módulos, y para que cambiarla en Dokploy no exija reconstruir la imagen.
 */
const URL_POR_DEFECTO = 'https://reparto.procovar.cloud';

/**
 * EL PORTAL DE PROCOVAR: la entrada común a todo lo demás.
 *
 * **No depende de nadie.** Es una dirección que una persona pulsa, no un servicio
 * al que se le pregunta, así que el enlace se pinta en el servidor y sale siempre,
 * también el día que la api del reparto no conteste y no haya botón de descarga.
 *
 * En variable de entorno como el resto, igual que el `PORTAL_URL` de la puerta del
 * reparto, para no dejar una dirección de producción clavada en el código.
 */
export function enlaceDelPortal(): string {
    return process.env.PORTAL_URL || 'https://procovar.cloud';
}

/**
 * Cuánto se espera a la api del reparto.
 *
 * Corto a propósito. Esto no bloquea el login —lo pide el navegador aparte— pero sí
 * ocupa un trabajador del servidor de Accesos, y Accesos es la puerta de la casa.
 */
function esperaMs(): number {
    return Number(process.env.REPARTO_ANUNCIO_ESPERA_MS || 3000);
}

/** Cuánto vale lo que se trajo bien. El anuncio sólo cambia al publicar una versión. */
function cacheOkMs(): number {
    return Number(process.env.REPARTO_ANUNCIO_CACHE_MS || 5 * 60_000);
}

/**
 * Y cuánto vale un «no se pudo».
 *
 * Mucho más corto: si la api del reparto acaba de volver, la puerta tiene que
 * enterarse en menos de un minuto. Pero no cero, porque entonces cada visita a la
 * pantalla de entrar volvería a llamar a una api caída.
 */
const CACHE_FALLO_MS = 30_000;

let guardado: { oferta: OfertaDeLaPuerta | null; hasta: number } | null = null;

/** Sólo para las pruebas: tira lo guardado. */
export function olvidarLoGuardado(): void {
    guardado = null;
}

/**
 * Pregunta a la api del reparto qué hay colgado. **Nunca lanza.**
 *
 * Lo guardado se reusa mientras valga. Un fallo también se guarda, poco rato, para
 * no machacar una api caída desde la pantalla más visitada de la casa.
 */
export async function ofertaDeLaPuerta(): Promise<OfertaDeLaPuerta | null> {
    if (guardado && Date.now() < guardado.hasta) return guardado.oferta;

    const base = (process.env.REPARTO_API_URL || URL_POR_DEFECTO).replace(/\/+$/, '');
    let oferta: OfertaDeLaPuerta | null = null;
    let fallo = false;

    try {
        const r = await fetch(`${base}/api/version`, {
            headers: { Accept: 'application/json' },
            // Sin caché de Next: el nuestro está aquí abajo, donde se puede razonar.
            cache: 'no-store',
            signal: AbortSignal.timeout(esperaMs()),
        });

        // GUARDA: una respuesta que no es 200 no se lee. Un 404 o un 502 del proxy
        // traen cuerpo —una página de error— y leerlo daría `null` por el camino
        // largo, sin que quedara dicho en ningún registro que la api está mal.
        if (!r.ok) {
            fallo = true;
            logger.info(`[puerta] la api del reparto contestó ${r.status}`);
        } else {
            oferta = leerElAnuncio(await r.json());
        }
    } catch (e) {
        // Sin red, DNS que no resuelve, se acabó la espera, un cuerpo que no es
        // JSON: no se sabe, y no saber no se cuenta. Lo que NO puede pasar es que
        // esto tumbe la puerta de nadie.
        fallo = true;
        logger.info(`[puerta] no se pudo mirar qué hay colgado: ${(e as Error).message}`);
    }

    guardado = { oferta, hasta: Date.now() + (fallo ? CACHE_FALLO_MS : cacheOkMs()) };

    return oferta;
}
