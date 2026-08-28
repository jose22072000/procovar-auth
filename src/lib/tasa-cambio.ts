/**
 * La tasa de cambio USD -> CUP, por sucursal.
 *
 * Vive en Accesos porque es un dato de la SUCURSAL, y la sucursal es de aquí. Antes
 * estaba sólo en PEDIDO, así que delivery se apañaba con una tasa escrita a mano en su
 * pantalla de Configuración: dos números para lo mismo. Un domicilio salía por un importe
 * en una aplicación y por otro en la de al lado, y eso no falla en pantalla — sale un
 * número creíble y cuadra mal en la caja, que es donde se descubre tarde.
 *
 * El valor lo pone la API de Entrega, que ya la mantiene para su aplicación. Se trae de
 * ahí en vez de teclearla para que todos cobren con la MISMA.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * La API de tasas de Entrega, por la RED INTERNA del servidor.
 *
 * `delivery_api_apk` es el nombre del CONTENEDOR, no el de la aplicación —que se llama
 * Entrega—: es una dirección de red y no se traduce. Se le llama por dentro y no por su
 * dominio público porque los dos están en la misma máquina, y porque su dominio público
 * ni siquiera negocia TLS (el certificado no cubre dos niveles de subdominio).
 *
 * La configuración la pone Dokploy, nunca el repositorio.
 */
const URL_TASAS = process.env.TASA_CAMBIO_URL || 'http://delivery_api_apk/api/v1/tasas/consulta';
const TOKEN = process.env.TASA_CAMBIO_TOKEN || '';

/** Cuántas horas puede tener una tasa antes de dejar de ser de fiar. */
export const HORAS_FRESCA = Number(process.env.TASA_CAMBIO_HORAS || 24);

/** Cada cuánto se vuelve a preguntar. La tasa se mueve a diario. */
const REFRESCO_MS = Number(process.env.TASA_CAMBIO_MS || 6 * 60 * 60 * 1000);

export interface Tasa {
    codigo: string;
    cupPorUsd: number;
    /**
     * CUP por km y por kg. Es con lo que Entrega cobra el domicilio:
     * `importe = tarifaBase × distancia × peso`.
     */
    tarifaBase: number | null;
    fuente: string | null;
    traidoAt: Date;
    /** false cuando lleva más de `HORAS_FRESCA` sin actualizarse. */
    fresca: boolean;
}

const conFrescura = (t: {
    codigo: string;
    cupPorUsd: number;
    tarifaBase: number | null;
    fuente: string | null;
    traidoAt: Date;
}): Tasa => ({
    ...t,
    fresca: (Date.now() - t.traidoAt.getTime()) / 3600000 <= HORAS_FRESCA,
});

/**
 * La tasa de UNA sucursal. Si no la tiene, NADA — nunca la de otra.
 *
 * Es el error que más daño hace de todos los posibles aquí: enseñar la tasa de La Habana
 * en Granma da un importe creíble, se lee bien y nadie lo cuestiona. Queda mal en la
 * caja, no en la pantalla. Sin tasa se dice que falta y de qué sucursal, que sí se
 * arregla.
 */
export async function tasaDe(codigo: string): Promise<Tasa | null> {
    const t = await prisma.tasaCambio.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });

    return t ? conFrescura(t) : null;
}

/** Todas las que hay, para quien las quiera de una vez. */
export async function todasLasTasas(): Promise<Tasa[]> {
    const filas = await prisma.tasaCambio.findMany({ orderBy: { codigo: 'asc' } });

    return filas.map(conFrescura);
}

/** La escribe a mano quien administra. Queda marcada como manual, para saberlo. */
export async function ponerTasa(
    codigo: string,
    cupPorUsd: number,
    fuente = 'manual',
    tarifaBase?: number | null,
): Promise<Tasa> {
    const clave = codigo.trim().toUpperCase();
    // La tarifa sólo se pisa si viene: al ponerla a mano se cambia la tasa, no la tarifa.
    const conTarifa = tarifaBase != null && Number.isFinite(tarifaBase) ? { tarifaBase } : {};
    const t = await prisma.tasaCambio.upsert({
        where: { codigo: clave },
        update: { cupPorUsd, fuente, traidoAt: new Date(), ...conTarifa },
        create: { codigo: clave, cupPorUsd, fuente, ...conTarifa },
    });

    return conFrescura(t);
}

/** Pide la tasa de UNA sucursal a la API de Entrega. */
async function preguntarAEntrega(codigo: string): Promise<{ valor?: number; tarifaBase?: number; error?: string }> {
    try {
        const r = await fetch(`${URL_TASAS}?codigoSucursal=${encodeURIComponent(codigo)}`, {
            // En la cabecera y no en la URL: un token en el query string queda escrito en
            // los registros de todo lo que haya por el camino, y de ahí ya no se borra.
            headers: { 'X-API-Token': TOKEN, Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
        });

        if (!r.ok) {
            // Dichos como se entienden. Un 404 aquí casi siempre es que esa sucursal no
            // tiene tasa cargada todavía, no que la API esté mal.
            const porQue: Record<number, string> = {
                401: 'token rechazado (X-API-Token)',
                404: 'sin tasa vigente para esa sucursal',
            };

            return { error: porQue[r.status] ?? `Entrega contestó ${r.status}` };
        }

        const b = (await r.json()) as Record<string, unknown>;
        /**
         * Entrega la llama `tasa_cup`.
         *
         * Su respuesta es:
         *   {"codigo_sucursal":"HAB0001","sucursal":"Sucursal Habana","tasa_cup":685,
         *    "vigente_desde":"2026-08-25","tarifa_base":1,...}
         *
         * Se probaron primero los nombres de siempre —`tasa`, `valor`, `cupPorUsd`— y
         * ninguno estaba, así que TODAS las sucursales se guardaron como fallidas: la
         * llamada iba bien, contestaba 200 con el número dentro, y aquí se descartaba.
         * Se dejan los otros nombres detrás por si algún día cambia.
         */
        const valor = Number(b?.tasa_cup ?? b?.tasa ?? b?.valor ?? b?.cupPorUsd ?? b?.venta);

        // Una tasa de 0 o negativa no es una tasa: es un fallo con forma de dato.
        // Guardarla dejaría todos los importes en CUP a cero sin que nada avisara.
        if (!Number.isFinite(valor) || valor <= 0) {
            return { error: `no se entendió la respuesta: ${JSON.stringify(b).slice(0, 120)}` };
        }

        /**
         * Y la TARIFA BASE, que viene en la misma respuesta.
         *
         * Se descartaba. Es el otro número con el que Entrega cobra —el importe es
         * `tarifa × distancia × peso`— y sin él, quien tenga que calcular lo mismo fuera
         * de la APK acaba inventándose una fórmula parecida que da otro número.
         */
        const tarifa = Number(b?.tarifa_base ?? b?.tarifaBase);

        return { valor, tarifaBase: Number.isFinite(tarifa) && tarifa > 0 ? tarifa : undefined };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

/**
 * Refresca las tasas de todas las sucursales activas.
 *
 * Una sucursal que falla no impide las demás: se guarda lo que sí llegó y se devuelve el
 * detalle. Si se abortara al primer fallo, una sucursal sin tasa en Entrega dejaría a las
 * otras siete sin actualizar.
 */
export async function refrescarTasas(): Promise<{
    actualizadas: string[];
    fallos: Array<{ codigo: string; error: string }>;
}> {
    const sucursales = await prisma.organization.findMany({
        where: { activa: true, codigo: { not: null } },
        select: { codigo: true },
    });

    const actualizadas: string[] = [];
    const fallos: Array<{ codigo: string; error: string }> = [];

    for (const s of sucursales) {
        const codigo = (s.codigo as string).toUpperCase();
        const { valor, tarifaBase, error } = await preguntarAEntrega(codigo);

        if (valor == null) {
            fallos.push({ codigo, error: error ?? 'sin respuesta' });
            continue;
        }
        await ponerTasa(codigo, valor, 'entrega', tarifaBase ?? null);
        actualizadas.push(codigo);
    }

    logger.info(
        `[tasa] refresco terminado: ${actualizadas.length} actualizadas, ${fallos.length} fallos`,
    );

    return { actualizadas, fallos };
}

/**
 * Refresca en segundo plano si lo que hay está viejo, y no espera.
 *
 * Quien lee una tasa quiere el número YA: hacerle esperar a una llamada a otra aplicación
 * convierte cada consulta en dos, y si Entrega tarda, tarda todo. Se devuelve lo guardado
 * —diciendo si está fresco— y el refresco se dispara aparte.
 *
 * Sin proceso aparte a propósito: esto se despliega como una aplicación web, y un worker
 * más es otra cosa que puede estar caída sin que nadie lo note.
 */
let refrescando = false;
let ultimoIntento = 0;

export function refrescarSiHaceFalta(): void {
    if (refrescando || Date.now() - ultimoIntento < REFRESCO_MS) return;
    refrescando = true;
    ultimoIntento = Date.now();

    void refrescarTasas()
        .catch((e) => logger.warn(`[tasa] el refresco de fondo falló: ${(e as Error).message}`))
        .finally(() => {
            refrescando = false;
        });
}
