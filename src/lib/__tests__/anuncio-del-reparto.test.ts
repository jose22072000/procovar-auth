import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { enlaceDelPortal } from '../anuncio-del-reparto';

/**
 * LO UNICO QUE QUEDA DE ESTE FICHERO ES EL ENLACE DEL PORTAL.
 *
 * Aqui habia diez pruebas mas, las del anuncio del reparto: que se le preguntaba
 * a su api por el APK colgado, que no se esperaba mucho, que una api caida no
 * tumbaba la puerta. Se fueron con lo que probaban el 25/09/2026 —ver
 * `src/lib/anuncio-del-reparto.ts`—: por esta puerta entra toda la casa y la
 * aplicacion de los repartidores no le sirve a quien viene a abrir Caja.
 *
 * Se borran en vez de dejarlas apagadas: una prueba que no prueba nada es una
 * prueba que alguien tendra que leer para descubrir que no prueba nada.
 */

const entornoOriginal = { ...process.env };

beforeEach(() => {
    process.env = { ...entornoOriginal };
});

afterEach(() => {
    process.env = { ...entornoOriginal };
});

describe('enlaceDelPortal — no depende de nadie', () => {
    it('es procovar.cloud mientras no se diga otra cosa', () => {
        delete process.env.PORTAL_URL;
        expect(enlaceDelPortal()).toBe('https://procovar.cloud');
    });

    it('se puede cambiar por entorno, como el resto', () => {
        process.env.PORTAL_URL = 'https://ensayo.procovar.cloud';
        expect(enlaceDelPortal()).toBe('https://ensayo.procovar.cloud');
    });
});
