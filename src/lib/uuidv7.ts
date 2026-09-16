/**
 * UUIDv7: un identificador que ORDENA por el momento en que se creó.
 *
 * ## Por qué, y por qué v7 y no v4
 *
 * Un v4 es 122 bits al azar: dos ids creados con un minuto de diferencia no
 * guardan ninguna relación entre sí, así que ordenar por id es ordenar por nada.
 * Un v7 lleva delante los milisegundos desde 1970, de modo que **el orden
 * alfabético de los ids es el orden en que se crearon**. Eso importa aquí por
 * tres razones concretas:
 *
 *  1. En Postgres, un índice sobre una clave que crece por el final se llena por
 *     el extremo derecho en vez de salpicar páginas al azar. Con v4 cada alta
 *     toca una página distinta del índice.
 *  2. Un listado «lo último primero» sale del propio índice, sin ordenar por
 *     `created_at`.
 *  3. Y la que decidió esto: **el trabajo que se hace sin conexión**. En el
 *     reparto, cuatro teléfonos sin señal crean cosas toda la mañana; cuando
 *     suben, los ids se mezclan. Con v7 quedan en el orden real en que
 *     ocurrieron, sin ponerse de acuerdo entre ellos y sin chocar nunca.
 *
 * ## Qué sustituye
 *
 * better-auth ponía ids de 32 caracteres alfanuméricos al azar
 * (`@better-auth/core`, `createRandomStringGenerator`), y el `@default(cuid())`
 * del `schema.prisma` casi nunca llegaba a aplicarse porque el id venía ya
 * puesto. En la base convivían los dos formatos —163 cuid de las semillas y
 * alnum32 de better-auth— sin que eso rompiera nada: todas las columnas son
 * `text` y ninguna otra aplicación los valida.
 *
 * Por eso esto entra **sólo para lo nuevo**. No se reescribe ni una fila vieja:
 * reescribir un `user.id` es tocar `account`, `session`, `member` y `audit_log`,
 * y no hay nada que ganar. Un tercer formato entra en el mismo hueco en el que
 * ya conviven dos.
 *
 * ## El atajo que NO sirve
 *
 * better-auth admite `generateId: "uuid"`, pero eso es **v4**: da el uuid y
 * pierde justo lo que se venía a buscar, que es el orden.
 *
 * ## Por qué escrito a mano
 *
 * Son veinte líneas y evita una dependencia más en un servicio que hoy sólo
 * tiene `nanoid` (que no hace v7). El formato está fijado por el RFC 9562 §5.7 y
 * no se mueve.
 */

/**
 * Lo último que se entregó, para no repetir ni desordenar dentro del mismo
 * milisegundo.
 *
 * Sin esto, dos altas en el mismo milisegundo salen con la misma marca de tiempo
 * y su orden lo decide la parte aleatoria, que es azar: se pierde el orden justo
 * cuando más apretado va el sistema. Con el contador, el segundo id del mismo
 * milisegundo va garantizado por detrás del primero.
 *
 * Y si el reloj del sistema SALTA HACIA ATRÁS —un ajuste de NTP, un cambio a
 * mano—, se sigue usando la marca anterior y se avanza el contador. Un id que
 * ordena antes que otro creado antes es peor que un id con la hora un pelo
 * adelantada: la hora dentro de un id es para ordenar, no para fechar nada.
 */
let ultimoMs = 0;
let contador = 0;

/** El tope del contador de 12 bits del RFC: 4096 por milisegundo. */
const TOPE_CONTADOR = 0x1000;

export function uuidv7(): string {
    let ms = Date.now();

    if (ms > ultimoMs) {
        ultimoMs = ms;
        // Se arranca por debajo del tope para dejar sitio a los del mismo
        // milisegundo sin desbordar casi nunca.
        contador = azar12() & 0x3ff;
    } else {
        // Mismo milisegundo, o el reloj se fue hacia atrás.
        contador += 1;
        if (contador >= TOPE_CONTADOR) {
            // Más de 4096 en un milisegundo: se pide prestado al siguiente. Sigue
            // ordenando, que es lo que importa.
            ultimoMs += 1;
            contador = 0;
        }
        ms = ultimoMs;
    }

    const bytes = new Uint8Array(16);

    // 48 bits de milisegundos, los primeros: es lo que hace que ordene.
    bytes[0] = (ms / 2 ** 40) & 0xff;
    bytes[1] = (ms / 2 ** 32) & 0xff;
    bytes[2] = (ms / 2 ** 24) & 0xff;
    bytes[3] = (ms / 2 ** 16) & 0xff;
    bytes[4] = (ms / 2 ** 8) & 0xff;
    bytes[5] = ms & 0xff;

    // 4 bits de versión (0111 = 7) y los 12 del contador.
    bytes[6] = 0x70 | ((contador >>> 8) & 0x0f);
    bytes[7] = contador & 0xff;

    // Los 62 restantes, al azar, con los 2 bits de variante (10) delante.
    const resto = new Uint8Array(8);
    crypto.getRandomValues(resto);
    bytes[8] = (resto[0] & 0x3f) | 0x80;
    for (let i = 1; i < 8; i++) bytes[8 + i] = resto[i];

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return (
        `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
        `${hex.slice(16, 20)}-${hex.slice(20)}`
    );
}

function azar12(): number {
    const b = new Uint8Array(2);
    crypto.getRandomValues(b);
    return ((b[0] << 8) | b[1]) & 0xfff;
}

/** La hora que lleva dentro un v7. Para leer un registro, no para fechar nada. */
export function cuandoSeCreo(id: string): Date {
    const hex = id.replace(/-/g, '').slice(0, 12);
    return new Date(parseInt(hex, 16));
}
