/**
 * De dónde salió una sesión, dicho en cristiano.
 *
 * La tabla de sesiones enseñaba "Directo" en la columna Cliente y no lo entendía
 * nadie — con razón: "directo" no es un sitio. Son dos cosas distintas y hacen
 * falta las dos:
 *
 *   · la APLICACIÓN por la que se entró (PEDIDO, delivery… o aquí mismo), y
 *   · el SITIO desde el que se entró: la IP y el aparato.
 *
 * Sirve para responder "¿quién entró en mi cuenta?" y "¿desde dónde se hizo
 * esto?", que es media auditoría.
 */

/** Nombre de cara al público de cada aplicación registrada. */
const APLICACIONES: Record<string, string> = {
  pedido: 'PEDIDO',
  analitics: 'Analitics',
  delivery: 'Delivery',
  ccsa: 'Tablero Parranda',
};

/**
 * Qué aplicación mandó a esta persona a identificarse.
 *
 * Sin `clientId` no vino de ninguna: abrió la página de cuentas y entró ahí.
 * Eso es lo que antes se llamaba "Directo", una palabra que no dice nada.
 */
export function aplicacionDeSesion(clientId: string | null | undefined): string {
  if (!clientId) return 'Entró aquí, en Cuentas';
  return APLICACIONES[clientId] ?? clientId;
}

const NAVEGADORES: [RegExp, string][] = [
  // El orden importa: Edge y Opera también dicen "Chrome" en su cadena, y
  // Chrome dice "Safari". Se comprueban primero los que mienten.
  [/edg(?:e|a|ios)?\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/samsungbrowser/i, 'Samsung Internet'],
  [/firefox\/|fxios/i, 'Firefox'],
  [/chrome\/|crios/i, 'Chrome'],
  [/safari\//i, 'Safari'],
];

const SISTEMAS: [RegExp, string][] = [
  [/iphone/i, 'iPhone'],
  [/ipad/i, 'iPad'],
  [/android/i, 'Android'],
  [/windows/i, 'Windows'],
  [/mac os x|macintosh/i, 'Mac'],
  [/linux/i, 'Linux'],
];

/**
 * El aparato, en dos palabras: "Chrome en Windows".
 *
 * No se pretende acertar siempre —las cadenas de agente mienten a propósito
 * desde hace veinte años—, sino dar algo reconocible: quien mira quiere saber
 * si fue desde su ordenador o desde un teléfono que no es suyo.
 */
export function aparatoDeSesion(userAgent: string | null | undefined): string | null {
  const ua = (userAgent ?? '').trim();
  if (!ua) return null;

  const navegador = NAVEGADORES.find(([re]) => re.test(ua))?.[1];
  const sistema = SISTEMAS.find(([re]) => re.test(ua))?.[1];

  if (navegador && sistema) return `${navegador} en ${sistema}`;
  if (navegador) return navegador;
  if (sistema) return sistema;
  return null;
}

/**
 * El sitio: la IP y el aparato juntos, para una sola celda.
 *
 * Si no consta ninguno de los dos devuelve null, y la pantalla enseña un guion.
 * Nada de inventarse un "Desconocido" que parezca un dato.
 */
export function desdeDonde(
  ip: string | null | undefined,
  userAgent: string | null | undefined,
): { ip: string | null; aparato: string | null } {
  const limpia = (ip ?? '').trim();
  return {
    ip: limpia || null,
    aparato: aparatoDeSesion(userAgent),
  };
}
