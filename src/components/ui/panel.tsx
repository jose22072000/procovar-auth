"use client";

/**
 * Un CAJÓN. Lateral en la computadora, desde abajo en el móvil.
 *
 * Aquí había modales, y un modal centrado no va bien para lo que hace esta aplicación.
 * Los formularios de Accesos son largos —una sucursal con sus almacenes, una persona con
 * sus roles— y un modal crece hacia los dos lados hasta que no cabe: se queda con su
 * propio desplazamiento dentro de la pantalla, tapa lo que estabas mirando y no deja
 * comprobar contra la lista de al lado.
 *
 * Un cajón lateral se abre por el borde, deja la lista visible detrás y tiene el alto
 * entero de la pantalla, que es justo lo que un formulario largo necesita.
 *
 * En el móvil sube desde abajo: un cajón LATERAL en un teléfono es lo peor de las dos
 * cosas —el formulario contra el borde, y el teclado al abrirse empuja el botón de
 * guardar fuera—. El de abajo se queda pegado al pulgar y crece con su contenido.
 *
 * Por dentro no hay dos versiones de nada: en HeroUI el Drawer ES el Modal con otra
 * animación, y `DrawerContent` es literalmente `ModalContent`. Así que lo de dentro se
 * escribe una sola vez y aquí sólo se elige el borde por el que entra.
 *
 * **Y así se queda, también en escritorio.** El 05/09/2026 se decidió que el resto de
 * las aplicaciones usen modal en escritorio y cajón por debajo de 1024 px; ésta es una
 * excepción aprobada por Jose ese mismo día, por lo de arriba. No hay que
 * «armonizarla»: se miró y se dejó a propósito.
 * */

import { useEffect, useState } from "react";
import { Drawer, type DrawerProps, type ModalProps } from "@heroui/react";

/** ¿Pantalla de teléfono? Se mira de verdad, no por el ancho al cargar: quien gira el
 *  móvil o parte la pantalla en dos cambia de sitio sin recargar. */
export function useEsMovil(hasta = 640): boolean {
  const [esMovil, setEsMovil] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia(`(max-width: ${hasta}px)`);
    const mirar = () => setEsMovil(consulta.matches);
    mirar();
    consulta.addEventListener("change", mirar);
    return () => consulta.removeEventListener("change", mirar);
  }, [hasta]);

  return esMovil;
}

/**
 * Los tamaños de modal, traducidos a ancho de cajón.
 *
 * En un cajón lateral `size` es el ANCHO y en uno de abajo el ALTO, así que el mismo
 * "2xl" quiere decir cosas distintas. Se traduce en vez de pasarlo tal cual: un "sm"
 * —el "¿seguro que quieres salir?"— no tiene por qué ocupar media pantalla, y un "2xl"
 * —el detalle de una persona con sus roles— no cabe en un cajón estrecho.
 */
const ANCHOS: Record<string, DrawerProps["size"]> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
  "3xl": "3xl",
  "4xl": "3xl",
  "5xl": "3xl",
  full: "full",
};

export function Panel({ children, size, placement, scrollBehavior, ...props }: ModalProps) {
  const esMovil = useEsMovil();

  /**
   * `placement` y `scrollBehavior` del modal NO se pasan.
   *
   * Un modal acepta "center" y "auto"; un cajón sólo los cuatro bordes. Y su
   * `scrollBehavior` acepta "normal", que en un cajón no significa nada. Pasarlos tal cual
   * compilaba con `any` y rompía en cuanto alguien usara "center" — que es el valor por
   * defecto de la mitad de los modales.
   */
  void placement;

  const desplazamiento: DrawerProps["scrollBehavior"] =
    scrollBehavior === "outside" ? "outside" : "inside";

  if (esMovil) {
    // Desde abajo, y sin `size`: ahí mide el alto, y el "2xl" que en la computadora es
    // un ancho cómodo aquí ocuparía la pantalla entera.
    return (
      <Drawer placement="bottom" scrollBehavior={desplazamiento} {...props}>
        {children}
      </Drawer>
    );
  }

  return (
    <Drawer
      placement="right"
      size={ANCHOS[String(size ?? "md")] ?? "md"}
      scrollBehavior={desplazamiento}
      {...props}
    >
      {children}
    </Drawer>
  );
}
