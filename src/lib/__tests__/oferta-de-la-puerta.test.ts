import { describe, it, expect } from 'vitest';

import {
    enMegas,
    leerElAnuncio,
    queSeEnsenaDeLaDescarga,
} from '../oferta-de-la-puerta';

/**
 * LAS DOS SALIDAS DE LA PUERTA — lo que se lee del anuncio y lo que se enseña.
 *
 * Todo esto cuelga de una regla: **la pantalla de entrar es la puerta de TODAS las
 * aplicaciones de la casa**, así que el reparto puede estar caído, puede no tener
 * nada colgado o puede contestar cualquier cosa, y lo único que no puede pasar es
 * que alguien vea un enlace roto o no pueda entrar.
 */

/** El anuncio de verdad, copiado de `GET https://reparto.procovar.cloud/api/version`. */
const ANUNCIO = {
    version: 'a1b2c3d',
    ultima: {
        version: '1.0.1',
        compilacion: 2,
        descargas: {
            android: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk',
        },
        ficheros: { android: { bytes: 77646816, sha256: '5656ab' } },
    },
};

describe('leerElAnuncio — qué se saca de lo que anuncia el reparto', () => {
    it('saca la versión, el enlace y el tamaño del anuncio real', () => {
        expect(leerElAnuncio(ANUNCIO)).toEqual({
            version: '1.0.1',
            enlace: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk',
            bytes: 77646816,
        });
    });

    // `ultima: null` es el estado NORMAL mientras no se publique nada, no un fallo.
    it('no ofrece nada cuando todavía no hay nada colgado', () => {
        expect(leerElAnuncio({ version: 'a1b2c3d', ultima: null })).toBeNull();
    });

    it('no ofrece nada cuando el anuncio no trae descarga de Android', () => {
        expect(
            leerElAnuncio({ ultima: { version: '1.0.1', descargas: { windows: 'https://x/y.exe' } } }),
        ).toBeNull();
    });

    it('no ofrece nada cuando el enlace viene vacío', () => {
        expect(leerElAnuncio({ ultima: { version: '1.0.1', descargas: { android: '' } } })).toBeNull();
    });

    /**
     * Esto pinta un `<a href>` en la puerta de toda la casa a partir de un texto de
     * otro servicio. Un `javascript:` ahí lo ve quien viene a escribir su
     * contraseña.
     */
    it('no acepta un enlace que no sea una dirección web', () => {
        for (const malo of ['javascript:alert(1)', 'data:text/html,<script>', '/reparto.apk', 'apk']) {
            expect(leerElAnuncio({ ultima: { version: '1.0.1', descargas: { android: malo } } })).toBeNull();
        }
    });

    it('no ofrece nada cuando el cuerpo vino raro (un proxy por medio)', () => {
        for (const raro of [null, undefined, '<html>502 Bad Gateway</html>', 42, []]) {
            expect(leerElAnuncio(raro)).toBeNull();
        }
    });

    it('no ofrece nada sin número de versión: no se puede decir qué se baja', () => {
        expect(leerElAnuncio({ ultima: { version: '', descargas: { android: 'https://x/y.apk' } } })).toBeNull();
    });

    /**
     * El tamaño es opcional —una api anterior al 22/09/2026 no manda `ficheros`—
     * pero su ausencia NO quita la descarga: quita el número.
     */
    it('ofrece la descarga sin tamaño cuando el anuncio no lo dice', () => {
        expect(leerElAnuncio({ ultima: { version: '1.0.1', descargas: { android: 'https://x/y.apk' } } })).toEqual({
            version: '1.0.1',
            enlace: 'https://x/y.apk',
            bytes: null,
        });
    });

    // Un «0 B» es un número creíble y falso, y es peor que no decir nada.
    it('trata un tamaño de cero o absurdo como que no se sabe', () => {
        for (const malo of [0, -1, Number.NaN, '77646816', null]) {
            expect(
                leerElAnuncio({
                    ultima: {
                        version: '1.0.1',
                        descargas: { android: 'https://x/y.apk' },
                        ficheros: { android: { bytes: malo } },
                    },
                })?.bytes,
            ).toBeNull();
        }
    });
});

describe('enMegas — como lo escribe el reparto, para que parezca el mismo fichero', () => {
    it('escribe el APK de verdad como 77,6 MB', () => {
        expect(enMegas(77646816)).toBe('77,6 MB');
    });

    it('baja a kB por debajo del mega', () => {
        expect(enMegas(240_000)).toBe('240 kB');
    });
});

describe('queSeEnsenaDeLaDescarga — la pareja: con anuncio y sin anuncio', () => {
    // CON ANUNCIO: sale el botón, y sale CON su tamaño dentro.
    it('con anuncio sale el botón con el tamaño en el propio botón', () => {
        expect(queSeEnsenaDeLaDescarga(leerElAnuncio(ANUNCIO))).toEqual({
            enlace: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk',
            version: '1.0.1',
            claveBoton: 'descargarConTamano',
            tamano: '77,6 MB',
            avisarSinTamano: false,
        });
    });

    // SIN ANUNCIO (api caída, o nada colgado): NO se pinta un enlace muerto.
    it('sin anuncio no se enseña nada: ni botón apagado ni aviso', () => {
        expect(queSeEnsenaDeLaDescarga(null)).toBeNull();
        expect(queSeEnsenaDeLaDescarga(undefined)).toBeNull();
    });

    it('sin tamaño hay botón, pero se dice que no se sabe cuánto pesa', () => {
        const sale = queSeEnsenaDeLaDescarga({ version: '1.0.1', enlace: 'https://x/y.apk', bytes: null });

        expect(sale?.claveBoton).toBe('descargar');
        expect(sale?.tamano).toBeUndefined();
        expect(sale?.avisarSinTamano).toBe(true);
    });
});
