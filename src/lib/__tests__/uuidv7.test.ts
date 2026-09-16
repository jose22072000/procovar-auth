import { describe, expect, it, vi } from 'vitest';

import { cuandoSeCreo, uuidv7 } from '../uuidv7';

/**
 * UUIDv7: lo que tiene que cumplir, y por qué cada cosa.
 *
 * Lo que se busca aquí no es «que sea un uuid» —eso es lo fácil—, sino **que
 * ordene**. Ésa es la única razón por la que se cambió el generador de ids de
 * better-auth: cuatro teléfonos sin señal creando cosas toda la mañana producen
 * ids que, al subir y mezclarse, tienen que quedar en el orden en que ocurrieron
 * de verdad. Con v4 quedarían barajados.
 */
describe('uuidv7', () => {
    const FORMA =
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    it('tiene la forma del RFC, con la versión 7 y la variante', () => {
        for (let i = 0; i < 200; i++) {
            expect(uuidv7()).toMatch(FORMA);
        }
    });

    it('ORDENA: lo creado antes va antes, también dentro del mismo milisegundo', () => {
        // Sin el contador de 12 bits, dos ids del mismo milisegundo comparten la
        // marca de tiempo y su orden lo decide la parte al azar. O sea: se pierde
        // el orden justo cuando más apretado va el sistema, que es cuando más
        // falta hace.
        const ids = Array.from({ length: 5000 }, () => uuidv7());
        const ordenados = [...ids].sort();
        expect(ids).toEqual(ordenados);
    });

    it('no repite ni uno', () => {
        const ids = new Set(Array.from({ length: 20000 }, () => uuidv7()));
        expect(ids.size).toBe(20000);
    });

    it('lleva dentro la hora en que se creó', () => {
        const antes = Date.now();
        const id = uuidv7();
        const despues = Date.now();

        const cuando = cuandoSeCreo(id).getTime();
        expect(cuando).toBeGreaterThanOrEqual(antes);
        expect(cuando).toBeLessThanOrEqual(despues + 1);
    });

    it('si el reloj SALTA HACIA ATRÁS, los ids siguen ordenando', () => {
        // Un ajuste de NTP o un cambio de hora a mano mueven `Date.now()` hacia
        // atrás. Un id que ordena ANTES que otro creado antes es peor que un id
        // con la hora un pelo adelantada: la hora dentro de un id está para
        // ordenar, no para fechar nada.
        const reloj = vi.spyOn(Date, 'now');
        try {
            reloj.mockReturnValue(1_700_000_000_000);
            const antes = [uuidv7(), uuidv7(), uuidv7()];

            // El reloj se va diez segundos atrás.
            reloj.mockReturnValue(1_699_999_990_000);
            const despues = [uuidv7(), uuidv7(), uuidv7()];

            const todos = [...antes, ...despues];
            expect(todos).toEqual([...todos].sort());
            expect(new Set(todos).size).toBe(6);
        } finally {
            reloj.mockRestore();
        }
    });

    it('aguanta más de 4096 en el mismo milisegundo sin repetir ni desordenar', () => {
        // El contador del RFC son 12 bits: 4096 por milisegundo. Al desbordar se
        // pide prestado al milisegundo siguiente, que sigue ordenando.
        const reloj = vi.spyOn(Date, 'now');
        try {
            reloj.mockReturnValue(1_700_000_100_000);
            const ids = Array.from({ length: 9000 }, () => uuidv7());
            expect(new Set(ids).size).toBe(9000);
            expect(ids).toEqual([...ids].sort());
        } finally {
            reloj.mockRestore();
        }
    });
});
