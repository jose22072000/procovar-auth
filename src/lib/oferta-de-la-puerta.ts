/**
 * QUÉ SE PUEDE OFRECER EN LA PUERTA, y cómo se lee el anuncio del reparto.
 *
 * Jose, 24/09/2026:
 *
 * > «recuerda q tienes q poner en el login q puedan descargar la aplicación y
 * > entrar a procovar.cloud […] para q puedan descargar la apk y instalarla»
 *
 * Ya estaba puesto en la puerta del reparto, pero **ahí casi nadie la ve**: en el
 * navegador esa pantalla se va sola al login único y su formulario sólo aparece el
 * día que Accesos falla. El login que la gente ve de verdad es éste. Por eso está
 * aquí también; el gemelo de allá es
 * `delivery-logistica/app/lib/pantallas/acceso/datos/oferta_de_la_puerta.dart`.
 *
 * **Este fichero no habla con nadie y no importa nada de Node**, y eso es a
 * propósito: lo comparten el servidor —que pregunta y decide— y el componente del
 * navegador —que pinta el tamaño—. Quien llama a la api del reparto es
 * `anuncio-del-reparto.ts`, que sí es sólo de servidor porque arrastra el registro.
 */

/** Lo que se puede ofrecer en la puerta. `null` cuando no hay nada. */
export interface OfertaDeLaPuerta {
    /** La versión que hay colgada, para que quien ya tenga una sepa si le aporta algo. */
    version: string;
    /** De dónde se baja el APK. Sale de `descargas.android` del anuncio. */
    enlace: string;
    /**
     * CUÁNTO PESA, o `null` si el anuncio no lo dijo.
     *
     * Son ~77 MB. Con la conexión de allá, pulsar sin saberlo es la tarde de datos
     * de alguien, y por eso el tamaño va **en el botón** y no en la letra pequeña.
     * Sale del anuncio (`ficheros.android.bytes`) y nunca del `Content-Length`:
     * Cloudflare lo quita, y el 22/09/2026 eso enseñó «30 MB/?» en el reparto.
     */
    bytes: number | null;
}

/**
 * Los megas, escritos como los escribe el reparto (`app/lib/mapa/anuncio_de_mapa.dart`).
 *
 * El mismo fichero tiene que leerse igual en las dos puertas: si aquí dijera
 * «77.6 MB» y allá «77,6 MB», parecerían dos descargas distintas.
 */
export function enMegas(bytes: number): string {
    if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;

    return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Un enlace de descarga sólo puede ser `http:` o `https:`.
 *
 * Esto pinta un `<a href>` en la puerta de TODAS las aplicaciones de la casa a
 * partir de un texto que llega de otro servicio. El día que ese texto no sea el que
 * creemos —una api equivocada en la configuración, un proxy que devuelve otra cosa,
 * la api del reparto comprometida— lo que no puede pasar es que el login de
 * Procovar acabe enseñando un enlace `javascript:` o `data:` a quien viene a
 * escribir su contraseña.
 */
function enlaceAceptable(valor: unknown): valor is string {
    if (typeof valor !== 'string' || valor === '') return false;
    try {
        const u = new URL(valor);

        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Traduce el cuerpo de `GET /api/version` del reparto a lo que se ofrece, o `null`.
 *
 * Aparte de la llamada para poder probar cada guarda sin red de por medio. El
 * contrato es el de `delivery-logistica/api/internal/api/version.go`:
 *
 * ```json
 * {"version":"…","ultima":{"version":"1.0.1","compilacion":2,
 *   "descargas":{"android":"https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk"},
 *   "ficheros":{"android":{"bytes":77646816,"sha256":"5656…"}}}}
 * ```
 *
 * **SI NO HAY ANUNCIO, NO SE PINTA UN ENLACE ROTO.** Devuelve `null` —y entonces la
 * puerta no enseña botón de descarga— en todos los casos en los que no hay nada
 * bueno que ofrecer: `ultima` es `null` (lo normal mientras no haya nada colgado),
 * no viene `descargas.android`, el enlace está vacío o no es una dirección web, o
 * el cuerpo vino raro porque había un proxy por medio.
 */
export function leerElAnuncio(cuerpo: unknown): OfertaDeLaPuerta | null {
    if (typeof cuerpo !== 'object' || cuerpo === null) return null;

    const ultima = (cuerpo as Record<string, unknown>).ultima;
    // `ultima: null` es lo NORMAL mientras no haya nada colgado, no un fallo.
    if (typeof ultima !== 'object' || ultima === null) return null;

    const u = ultima as Record<string, unknown>;
    const version = u.version;
    if (typeof version !== 'string' || version === '') return null;

    const descargas = u.descargas;
    if (typeof descargas !== 'object' || descargas === null) return null;

    // GUARDA: sin enlace no hay botón. Uno que lleva a un 404 es peor que no
    // ofrecer nada, porque además hace que alguien pregunte.
    const enlace = (descargas as Record<string, unknown>).android;
    if (!enlaceAceptable(enlace)) return null;

    /**
     * El tamaño es opcional: una api anterior al 22/09/2026 no manda `ficheros`.
     * No se inventa un número ni se enseña «0 B» —que es un número creíble y
     * falso—: se dice en la pantalla que no se sabe y que se baje con wifi.
     */
    const ficheros = u.ficheros;
    const android =
        typeof ficheros === 'object' && ficheros !== null
            ? (ficheros as Record<string, unknown>).android
            : null;
    const crudo =
        typeof android === 'object' && android !== null
            ? (android as Record<string, unknown>).bytes
            : null;
    const bytes = typeof crudo === 'number' && Number.isFinite(crudo) && crudo > 0 ? crudo : null;

    return { version, enlace, bytes };
}

/** Lo que el componente tiene que pintar. `null` = no se pinta nada. */
export interface DescargaQueSeEnsena {
    enlace: string;
    version: string;
    /** La clave del texto del botón, con o sin tamaño. */
    claveBoton: 'descargar' | 'descargarConTamano';
    /** El tamaño ya escrito («77,6 MB»), o `undefined` si el anuncio no lo dijo. */
    tamano?: string;
    /** Si además hay que decir que no se sabe cuánto pesa y que se baje con wifi. */
    avisarSinTamano: boolean;
}

/**
 * QUÉ SE ENSEÑA EN LA PUERTA, a partir de lo que el reparto anunció.
 *
 * La decisión entera está aquí y no dentro del componente porque el componente no
 * se puede renderizar en las pruebas de este repositorio —no hay DOM ni
 * testing-library instalados— y lo que hay que poder comprobar de verdad es la
 * pareja: **con anuncio sale el botón con su tamaño; sin anuncio no sale nada**.
 * Con la decisión aquí, romper cualquiera de las dos guardas lo caza una prueba.
 *
 * `null` cuando no hay nada que ofrecer: la api no contestó, no hay nada colgado o
 * el anuncio no traía enlace. Y `null` significa **que no se pinta nada**: ni botón
 * apagado, ni «ahora mismo no se puede», ni hueco reservado. Nadie llegó a esta
 * pantalla a descargarse nada, llegó a entrar a trabajar.
 */
export function queSeEnsenaDeLaDescarga(
    oferta: OfertaDeLaPuerta | null | undefined,
): DescargaQueSeEnsena | null {
    if (!oferta) return null;

    // EL TAMAÑO VA EN EL BOTÓN, no en la letra de debajo: son ~77 MB y con la
    // conexión de allá pulsar sin saberlo es la tarde de datos de alguien.
    if (oferta.bytes != null) {
        return {
            enlace: oferta.enlace,
            version: oferta.version,
            claveBoton: 'descargarConTamano',
            tamano: enMegas(oferta.bytes),
            avisarSinTamano: false,
        };
    }

    // Sin tamaño no se inventa un número ni se escribe «? MB» ni «0 B» —que es un
    // número creíble y falso—: se dice que no se sabe y que se baje con wifi.
    return {
        enlace: oferta.enlace,
        version: oferta.version,
        claveBoton: 'descargar',
        avisarSinTamano: true,
    };
}
