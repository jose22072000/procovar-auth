import { Skeleton } from "@heroui/react";

/**
 * El hueco que se enseña mientras una página del panel se está trayendo del servidor.
 *
 * # Por qué existe
 *
 * En el App Router de Next, al pulsar un enlace no se pinta NADA hasta que el servidor
 * termina de resolver la página entera. No es que vaya lento: es que la navegación se
 * queda esperando en silencio. Con una conexión mala eso son segundos con la pantalla
 * congelada, y quien está delante vuelve a pulsar creyendo que no registró el clic.
 *
 * Un `loading.tsx` en la carpeta de la ruta le dice a Next que puede enseñar esto de
 * inmediato y traerse el resto por debajo.
 *
 * # Por qué imita la forma de la página
 *
 * Un girador centrado también quita la sensación de que no pasa nada, pero deja la
 * pantalla dando un salto cuando llega el contenido: primero un círculo en medio, luego
 * una tabla. Con las mismas cajas en los mismos sitios, lo que llega ocupa el hueco que
 * ya estaba y la vista no se mueve.
 */
export function EsqueletoPagina({
  filas = 6,
  conBuscador = true,
}: {
  /** Cuántas filas de tabla insinuar. Ajústalo a lo que suele traer esa página. */
  filas?: number;
  /** Las páginas de listado llevan barra de filtros; las de perfil, no. */
  conBuscador?: boolean;
}) {
  return (
    // Los mismos márgenes y separaciones que las páginas de verdad, para que el
    // contenido no salte al aparecer.
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6" aria-busy aria-live="polite">
      {/* La cabecera: rótulo, título y subtítulo. */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-7 w-64 rounded" />
        <Skeleton className="h-4 w-80 rounded" />
      </div>

      {conBuscador && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 flex-1 min-w-56 rounded-lg" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: filas }, (_, i) => (
          // Se desvanecen hacia abajo: da idea de que hay más y evita que un bloque de
          // seis barras idénticas parezca contenido de verdad ya cargado.
          <Skeleton
            key={i}
            className="h-14 w-full rounded-lg"
            style={{ opacity: 1 - i * 0.12 }}
          />
        ))}
      </div>

      {/* Para quien no ve la pantalla: sin esto, un lector de pantalla se queda mudo
          durante toda la espera. */}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
