import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// El registro arrastra winston y escribe en disco: aquí sólo importa que la
// llamada no lance, no dónde acaba la línea.
vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { enlaceDelPortal, ofertaDeLaPuerta, olvidarLoGuardado } from '../anuncio-del-reparto';

/**
 * PREGUNTARLE AL REPARTO QUÉ HAY COLGADO, sin que eso pueda tumbar la puerta.
 *
 * NO SE LLAMA A NINGÚN DOMINIO DE PROCOVAR desde aquí: `fetch` está doblado en
 * todas las pruebas. Una prueba que saliera de verdad a `reparto.procovar.cloud`
 * saldría de la casa de Jose cada vez que alguien corre `vitest`.
 */

const ANUNCIO = {
    ultima: {
        version: '1.0.1',
        descargas: { android: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk' },
        ficheros: { android: { bytes: 77646816, sha256: '5656ab' } },
    },
};

/** Un doble de `fetch` que apunta con qué se le llamó. Nunca sale a la red. */
function contesta(cuerpo: unknown, ok = true, status = 200) {
    return vi.fn(
        async (_url: string, _opciones?: RequestInit) =>
            ({ ok, status, json: async () => cuerpo }) as unknown as Response,
    );
}

const entornoOriginal = { ...process.env };

beforeEach(() => {
    olvidarLoGuardado();
    process.env.REPARTO_API_URL = 'http://reparto-api-doble:8080';
});

afterEach(() => {
    process.env = { ...entornoOriginal };
    vi.unstubAllGlobals();
});

describe('ofertaDeLaPuerta — qué hay colgado del reparto', () => {
    it('le pregunta a /api/version de la dirección que diga el entorno', async () => {
        const doble = contesta(ANUNCIO);
        vi.stubGlobal('fetch', doble);

        const oferta = await ofertaDeLaPuerta();

        expect(doble.mock.calls[0][0]).toBe('http://reparto-api-doble:8080/api/version');
        expect(oferta).toEqual({
            version: '1.0.1',
            enlace: 'https://archivos.procovar.cloud/reparto/apk/reparto-1.0.1-260922.apk',
            bytes: 77646816,
        });
    });

    /**
     * La dirección va en variable de entorno **con valor por defecto**, nunca
     * incrustada: en Dokploy se apunta al appName interno, que es la misma máquina.
     * El defecto es el dominio público porque el sufijo del appName cambia cuando
     * se rehace la Application.
     */
    it('sin variable de entorno cae en el dominio público del reparto', async () => {
        delete process.env.REPARTO_API_URL;
        const doble = contesta(ANUNCIO);
        vi.stubGlobal('fetch', doble);

        await ofertaDeLaPuerta();

        expect(doble.mock.calls[0][0]).toBe('https://reparto.procovar.cloud/api/version');
    });

    it('le quita la barra final a la dirección para no pedir //api/version', async () => {
        process.env.REPARTO_API_URL = 'http://reparto-api-doble:8080/';
        const doble = contesta(ANUNCIO);
        vi.stubGlobal('fetch', doble);

        await ofertaDeLaPuerta();

        expect(doble.mock.calls[0][0]).toBe('http://reparto-api-doble:8080/api/version');
    });

    // LA API DEL REPARTO CAÍDA: no se sabe, y no saber no se cuenta. Sin excepción
    // hacia arriba, porque arriba está la puerta de todas las aplicaciones.
    it('con la api caída devuelve nada y no lanza', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new Error('fetch failed');
        }));

        await expect(ofertaDeLaPuerta()).resolves.toBeNull();
    });

    it('con la api contestando un error tampoco ofrece nada', async () => {
        // Un 502 del proxy trae cuerpo —una página de error— y leerlo daría `null`
        // por el camino largo, sin quedar dicho en ningún sitio que la api está mal.
        const doble = contesta(ANUNCIO, false, 502);
        vi.stubGlobal('fetch', doble);

        await expect(ofertaDeLaPuerta()).resolves.toBeNull();
    });

    it('con un cuerpo que no es JSON devuelve nada y no lanza', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('Unexpected token <');
            },
        }) as unknown as Response));

        await expect(ofertaDeLaPuerta()).resolves.toBeNull();
    });

    it('espera poco: la puerta de la casa no se queda colgada de otra aplicación', async () => {
        process.env.REPARTO_ANUNCIO_ESPERA_MS = '1500';
        const doble = contesta(ANUNCIO);
        vi.stubGlobal('fetch', doble);

        await ofertaDeLaPuerta();

        const opciones = doble.mock.calls[0][1];
        expect(opciones?.signal).toBeInstanceOf(AbortSignal);
        expect(opciones?.cache).toBe('no-store');
    });

    // Diez personas entrando a las siete de la mañana son UNA llamada al reparto.
    it('guarda la respuesta y no vuelve a preguntar en cada visita', async () => {
        const doble = contesta(ANUNCIO);
        vi.stubGlobal('fetch', doble);

        await ofertaDeLaPuerta();
        await ofertaDeLaPuerta();
        await ofertaDeLaPuerta();

        expect(doble).toHaveBeenCalledTimes(1);
    });

    // Y un fallo TAMBIÉN se guarda: si no, cada visita a la pantalla de entrar
    // volvería a llamar a una api caída.
    it('tampoco machaca a una api caída: el «no se pudo» también se guarda', async () => {
        const doble = vi.fn(async () => {
            throw new Error('fetch failed');
        });
        vi.stubGlobal('fetch', doble);

        await ofertaDeLaPuerta();
        await ofertaDeLaPuerta();

        expect(doble).toHaveBeenCalledTimes(1);
    });
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
