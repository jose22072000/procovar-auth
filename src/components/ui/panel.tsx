"use client";

/**
 * Un panel que sale como modal en la computadora y como cajón desde abajo en el móvil.
 *
 * Un modal centrado en un teléfono es incómodo de verdad: aparece flotando en medio,
 * el teclado al abrirse lo empuja fuera de la pantalla y el botón de guardar acaba
 * debajo del teclado. Un cajón que sube desde abajo se queda pegado al pulgar, crece
 * con su contenido y se cierra arrastrándolo, que es lo que la gente ya hace en
 * cualquier aplicación del teléfono.
 *
 * Por dentro no hay dos versiones de nada: en HeroUI el Drawer ES el Modal con otra
 * animación, y `DrawerContent` es literalmente `ModalContent`. Así que lo de dentro se
 * escribe una sola vez y aquí solo se elige el envoltorio.
 */

import { useEffect, useState } from "react";
import { Drawer, Modal, type ModalProps } from "@heroui/react";

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

export function Panel({ children, size, placement, scrollBehavior, ...props }: ModalProps) {
  const esMovil = useEsMovil();

  if (esMovil) {
    return (
      // `size` y `placement` no se pasan: en un cajón de abajo `size` mide el ALTO
      // —el "2xl" que en un modal quiere decir ancho aquí ocuparía la pantalla
      // entera— y `placement` solo acepta los cuatro bordes.
      <Drawer placement="bottom" scrollBehavior="inside" {...props}>
        {children}
      </Drawer>
    );
  }

  return (
    <Modal size={size} placement={placement} scrollBehavior={scrollBehavior} {...props}>
      {children}
    </Modal>
  );
}
