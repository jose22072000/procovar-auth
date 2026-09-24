import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GET } from '../descarga/route';
import { olvidarLoGuardado } from '@/lib/anuncio-del-reparto';

/**
 * GET /api/reparto/descarga — lo que el navegador de la puerta pregunta.
 *
 * Ninguna de estas pruebas sale a la red: `fetch` está doblado en todas.
 */

const ANUNCIO = {
    ultima: {
        version: '1.0.1',
        descargas: { android: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk' },
        ficheros: { android: { bytes: 77646816, sha256: '5656ab' } },
    },
};

beforeEach(() => {
    olvidarLoGuardado();
    process.env.REPARTO_API_URL = 'http://reparto-api-doble:8080';
});

afterEach(() => {
    delete process.env.REPARTO_API_URL;
    vi.unstubAllGlobals();
});

describe('GET /api/reparto/descarga', () => {
    it('con anuncio devuelve la versión, el enlace y el tamaño', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ANUNCIO }) as unknown as Response));

        const res = await GET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            oferta: {
                version: '1.0.1',
                enlace: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk',
                bytes: 77646816,
            },
        });
    });

    /**
     * CON LA API DEL REPARTO CAÍDA: 200 y `oferta: null`.
     *
     * Ni 404 ni 503 a propósito. Que no haya nada que ofrecer no es un fallo que
     * contar, y un error aquí saldría pintado en rojo en la consola del navegador
     * de todo el que entra a la casa.
     */
    it('con la api caída contesta 200 y nada que ofrecer, no un error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('fetch failed');
        }));

        const res = await GET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ oferta: null });
    });

    it('sin nada colgado contesta igual: 200 y nada que ofrecer', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ version: 'a1b2c3d', ultima: null }) }) as unknown as Response));

        const res = await GET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ oferta: null });
    });

    // SIN SESIÓN, y tiene que ser así: se pregunta desde la pantalla de entrar, que
    // es justo donde todavía no hay ninguna.
    it('no pide sesión: se contesta sin petición ni cabeceras', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ANUNCIO }) as unknown as Response));

        await expect(GET()).resolves.toBeDefined();
        expect(GET.length).toBe(0);
    });
});
