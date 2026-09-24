import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * LAS DOS SALIDAS DE LA PUERTA, miradas en el fuente.
 *
 * En este repositorio no hay DOM ni testing-library, así que un componente no se
 * puede renderizar en una prueba —es el mismo apaño que usa
 * `src/app/(base)/logout/__tests__/no-form-submit.test.ts`—. Lo que SÍ se prueba de
 * verdad, ejecutándolo, es la decisión: `queSeEnsenaDeLaDescarga` y el lector del
 * anuncio tienen sus propias pruebas. Aquí se vigilan las tres cosas que sólo se
 * pueden romper en el fuente, y que son justo las que tumbarían la puerta de toda
 * la casa.
 */

const raiz = (...p: string[]) => path.join(process.cwd(), ...p);
const SALIDAS = readFileSync(raiz('src/components/salidas-de-la-puerta.tsx'), 'utf8');
const DESCARGA = readFileSync(raiz('src/components/descarga-del-apk.tsx'), 'utf8');
const PANTALLA = readFileSync(raiz('src/components/pantalla-de-entrada.tsx'), 'utf8');
const PAGINA = readFileSync(raiz('src/app/(user)/page.tsx'), 'utf8');

/**
 * El fuente sin comentarios. Los comentarios de estos ficheros hablan justo de lo
 * que NO se pinta —«ni un botón apagado», «ni un ahora mismo no se puede»—, así que
 * buscar esas palabras sobre el fichero entero se cazaría a sí mismo.
 */
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('la página de entrada no depende del reparto para pintarse', () => {
    /**
     * LA GUARDA GORDA. Aquí llegan redirigidos el reparto, PEDIDO, Analítica, Caja
     * y Rutas. Si el render esperase a la api del reparto, una aplicación caída se
     * convertiría en segundos de espera —o en un 500— para quien viene a entrar a
     * cualquiera de las otras. La oferta la pide el navegador después, a
     * `/api/reparto/descarga`.
     */
    it('nada de lo que se pinta en el servidor llama a la api del reparto', () => {
        for (const fuente of [PAGINA, PANTALLA, SALIDAS]) {
            expect(fuente).not.toContain('ofertaDeLaPuerta');
            expect(fuente).not.toContain('reparto.procovar.cloud');
        }
    });

    it('la descarga se pregunta desde el navegador a nuestra propia api', () => {
        expect(DESCARGA).toContain("'use client'");
        expect(DESCARGA).toContain("fetch('/api/reparto/descarga'");
        // A la nuestra, no a la del reparto: el navegador no puede llamar a otro
        // origen sin que aquella conteste con CORS para este dominio.
        expect(DESCARGA).not.toContain('reparto.procovar.cloud');
    });

    it('si nuestra propia api falla, tampoco se pinta nada', () => {
        expect(DESCARGA).toContain('.catch(');
        expect(DESCARGA).toContain('if (!sale) return null;');
    });

    /**
     * Ni botón apagado, ni «ahora mismo no se puede», ni hueco reservado. Nadie
     * llegó a esta pantalla a descargarse nada, llegó a entrar a trabajar.
     */
    it('no hay botón muerto ni cartel de disculpa cuando no hay anuncio', () => {
        const pintado = sinComentarios(DESCARGA);

        expect(pintado).not.toMatch(/disabled|isDisabled|aria-disabled/);
        expect(pintado).not.toMatch(/no se puede|no disponible|inténtalo|Skeleton|animate-pulse/i);
    });
});

describe('el enlace del portal no depende de nadie', () => {
    // Sale SIEMPRE: el día que el reparto esté caído, y también si el navegador no
    // ejecuta JavaScript, porque lo pinta el servidor.
    it('lo pinta el servidor y no está dentro de ninguna condición', () => {
        expect(SALIDAS).not.toContain("'use client'");
        expect(SALIDAS).toContain('href={enlaceDelPortal()}');
        expect(SALIDAS).toMatch(/\{t\('portal'\)\}/);
        // Lo único condicionado es la descarga, y eso vive en su propio componente.
        expect(SALIDAS).not.toMatch(/\{\s*\w+\s*&&/);
    });

    it('la dirección sale de una variable de entorno, no escrita a mano aquí', () => {
        expect(SALIDAS).not.toContain('https://procovar.cloud');
        expect(SALIDAS).toContain('enlaceDelPortal');
    });
});

describe('las salidas van debajo del formulario, sin estorbar', () => {
    it('se pintan después del formulario de entrar', () => {
        expect(PANTALLA).toContain('<SalidasDeLaPuerta />');
        expect(PANTALLA.indexOf('<SignInForm')).toBeLessThan(PANTALLA.indexOf('<SalidasDeLaPuerta'));
    });

    // El único botón relleno de la pantalla es «Entrar». Estos van perfilado y de
    // texto para que se lean como lo segundo que son.
    it('ninguna de las dos se pinta como el botón principal', () => {
        expect(SALIDAS).not.toContain('bg-pv-azul ');
        expect(DESCARGA).not.toContain('bg-pv-azul ');
    });
});

describe('el salto del login único sigue intacto', () => {
    /**
     * Aquí llegan con `?callback=` desde el reparto, PEDIDO, Analítica, Caja y
     * Rutas. Esa rama —y la de `?op=`, y la del sondeo silencioso— tienen que
     * seguir resolviéndose ANTES de que se construya la pantalla de entrada, o
     * quien viene redirigido vería un formulario en vez de volver a su aplicación.
     */
    it('el callback se resuelve antes de pintar la pantalla de entrada', () => {
        expect(PAGINA).toContain('redirect(`/api/flow?callback=${encodeURIComponent(callback)}${promptQs}`)');
        expect(PAGINA.indexOf('?callback=')).toBeLessThan(PAGINA.indexOf('<PantallaDeEntrada'));
    });

    it('siguen estando las otras tres salidas del flujo', () => {
        expect(PAGINA).toContain("redirect(`/api/flow?op=${encodeURIComponent(op)}`)");
        expect(PAGINA).toContain("redirect('/api/flow/none')");
        expect(PAGINA).toContain("redirect('/api/flow/olvidar')");
    });

    it('la pantalla de entrada sigue siendo lo último, sólo para quien no tiene sesión', () => {
        expect(PAGINA).toContain('<PantallaDeEntrada savedEmail={savedEmail} />');
        expect(PAGINA.indexOf('<AccountView')).toBeLessThan(PAGINA.indexOf('<PantallaDeEntrada'));
    });
});
