/**
 * Procovar itself: the sucursales and the apps that use this login.
 *
 * These are facts about the business, not configuration to be discovered at
 * runtime — writing them down means a fresh database comes up complete instead
 * of needing somebody to remember eight branches and four callback URLs.
 */

/**
 * The eight sucursales, one organization each.
 *
 * `codigo` is the same code PEDIDO uses (CAM, HOL, …) and is what lets a person
 * be matched to their branch when the apps start reading identity from here.
 * `pedidoId` is that branch's id inside PEDIDO's own database: PEDIDO keeps its
 * own ids, so without this pair nobody could tell that "Camagüey there" and
 * "Camagüey here" are the same place.
 */
export const SUCURSALES = [
  { codigo: 'CAM', nombre: 'Camagüey',        pedidoId: 'cmpochz1v000801n4avkrxb42' },
  { codigo: 'GR',  nombre: 'Granma',          pedidoId: 'cmpocjmp7000f01n4ffoaw110' },
  { codigo: 'GTO', nombre: 'Guantánamo',      pedidoId: 'cmpociw0q000d01n4mfipjjal' },
  { codigo: 'HAB', nombre: 'La Habana',       pedidoId: 'cmpocin2d000c01n4rnojlo6x' },
  { codigo: 'HOL', nombre: 'Holguín',         pedidoId: 'cmpoci416000901n4chpn9rjb' },
  { codigo: 'SS',  nombre: 'Sancti Spíritus', pedidoId: 'cmpocig4y000b01n49ch49uva' },
  { codigo: 'STG', nombre: 'Santiago de Cuba', pedidoId: 'cmpoci8ls000a01n4b5iwog0g' },
  { codigo: 'TUN', nombre: 'Las Tunas',       pedidoId: 'cmpocj3tb000e01n4nozholp0' },
] as const

/**
 * The applications that send people here to log in.
 *
 * `allowedCallbackUrls` is a whitelist, matched exactly. It is the reason a
 * stolen link cannot bounce a freshly-authenticated session off to somebody
 * else's server, so it stays exact — no wildcards, no "starts with".
 */
export const APLICACIONES = [
  {
    clientId: 'pedido',
    name: 'PEDIDO',
    description: 'Pedidos, clientes y vendedores de las sucursales.',
    host: 'pedidos.procovar.cloud',
  },
  {
    clientId: 'analitics',
    name: 'Analitics',
    description: 'Informes de ventas, gestores y productos.',
    host: 'analitics.procovar.cloud',
  },
  {
    clientId: 'delivery',
    name: 'Delivery',
    description: 'Reparto y rutas.',
    host: 'delivery.procovar.cloud',
  },
  {
    clientId: 'rutas',
    name: 'Rutas',
    description: 'Recorridos de los vendedores sobre el mapa.',
    host: 'rutas.procovar.cloud',
  },
  {
    clientId: 'entrega',
    name: 'Entrega',
    description: 'Panel de la aplicación de los repartidores.',
    host: 'entrega.procovar.cloud',
  },
  {
    clientId: 'caja',
    name: 'Caja',
    description: 'Cobros y cierres de caja.',
    host: 'caja.procovar.cloud',
  },
  {
    clientId: 'traslado',
    name: 'Traslado',
    description: 'Movimientos de mercancía entre sucursales.',
    host: 'traslado.procovar.cloud',
  },
  {
    clientId: 'ccsa',
    name: 'Tablero Parranda',
    description: 'Tablero de Parranda / CCSA.',
    // Ya está en el VPS nuevo y responde. El aviso de que "todavía no existe" se
    // quedó de cuando seguía en el viejo: un comentario que dice lo contrario de lo
    // que pasa hace dudar de todo el fichero.
    host: 'ccsa.procovar.cloud',
  },
  {
    clientId: 'portal',
    name: 'Portal',
    description: 'La entrada común a todo lo demás.',
    host: 'procovar.cloud',
  },
] as const

export function callbacksDe(host: string): string[] {
  return [`https://${host}/auth/callback`]
}
