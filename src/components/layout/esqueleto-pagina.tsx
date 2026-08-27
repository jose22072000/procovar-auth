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
 * # Por qué son divs y no el Skeleton de HeroUI
 *
 * Porque esto es un componente de SERVIDOR y el de HeroUI es de cliente. Importarlo aquí
 * revienta al renderizar con `createContext is not a function` — y lo peor es que
 * `next build` compila sin quejarse: sólo falla al servir la página, en producción.
 *
 * Con divs y `animate-pulse` no hace falta nada de eso, y de paso no se manda ni un byte
 * de JavaScript para dibujar un hueco.
 *
 * # Por qué imita la forma de la página
 *
 * Un girador centrado también quita la sensación de que no pasa nada, pero deja la
 * pantalla dando un salto cuando llega el contenido: primero un círculo en medio, luego
 * una tabla. Con las mismas cajas en los mismos sitios, lo que llega ocupa el hueco que
 * ya estaba y la vista no se mueve.
 */

/** Una barra gris que late. El color sale de los tokens del tema, no de un gris fijo. */
function Barra({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-default-200/60 dark:bg-white/10 ${className}`}
      style={style}
    />
  );
}

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
        <Barra className="h-3 w-24" />
        <Barra className="h-7 w-64" />
        <Barra className="h-4 w-80" />
      </div>

      {conBuscador && (
        <div className="flex flex-wrap gap-3">
          <Barra className="h-11 min-w-56 flex-1 rounded-lg" />
          <Barra className="h-11 w-40 rounded-lg" />
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: filas }, (_, i) => (
          // Se desvanecen hacia abajo: da idea de que hay más y evita que un bloque de
          // barras idénticas parezca contenido de verdad ya cargado.
          <Barra
            key={i}
            className="h-14 w-full rounded-lg"
            style={{ opacity: Math.max(0.25, 1 - i * 0.12) }}
          />
        ))}
      </div>

      {/* Para quien no ve la pantalla: sin esto, un lector de pantalla se queda mudo
          durante toda la espera. */}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
