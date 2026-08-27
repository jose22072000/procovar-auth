import { EsqueletoPagina } from "@/components/layout/esqueleto-pagina";

/**
 * El hueco de los avisos, mientras el servidor la resuelve.
 *
 * Next lo enseña en cuanto se pulsa el enlace, sin esperar a nada. Sin este fichero la
 * navegación se queda muda: la pantalla anterior congelada hasta que llega la nueva.
 */
export default function Cargando() {
  return <EsqueletoPagina filas={7} />;
}
