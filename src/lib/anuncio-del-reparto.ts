/**
 * EL PORTAL DE PROCOVAR, que es lo unico que esta puerta ofrece ademas de entrar.
 *
 * Aqui vivia tambien el anuncio del reparto: se le preguntaba a su api que APK
 * habia colgado para ofrecerlo en el login. Se quito el 25/09/2026 y con el se
 * fue toda esa maquinaria —`ofertaDeLaPuerta`, `olvidarLoGuardado`, el
 * componente `descarga-del-apk.tsx` y la ruta `/api/reparto/descarga`—, porque
 * por esta puerta entra TODA la casa —PEDIDO, Analitics, Rutas, Delivery,
 * Entrega, Caja, Traslado y Parranda— y la aplicacion de los repartidores no le
 * sirve a quien viene a abrir Caja. Jose, viendolo: «por que en auth me pones a
 * descargar, si eso va para el login de Reparto».
 *
 * La descarga vive donde tiene sentido: en la puerta del PROPIO reparto
 * (`delivery-logistica/app/lib/pantallas/acceso/datos/oferta_de_la_puerta.dart`).
 *
 * Y se quita ENTERO, no a medias: dejar aqui el codigo que llama a la api del
 * reparto «por si acaso» es dejar que Accesos dependa de un servicio que ya no
 * necesita para nada, y que el dia que ese servicio cambie alguien venga a
 * arreglar algo que no se usa.
 */
export function enlaceDelPortal(): string {
    return process.env.PORTAL_URL || 'https://procovar.cloud';
}
