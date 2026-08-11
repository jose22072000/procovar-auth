"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

interface ProfilePageShellProps {
    title: string;
    /** Rótulo de encima del título: dice de qué apartado es esta pantalla. */
    rotulo?: string;
    count?: number;
    backPath?: string;
    children: React.ReactNode;
    /** Se acepta y se ignora: ver la nota de abajo. */
    icon?: React.ReactNode;
}

/**
 * El marco de las pantallas de "mi cuenta".
 *
 * Antes era una tarjeta blanca con sombra grande sobre fondo gris, dentro de un
 * contenedor con relleno superior a ojo para dejar sitio a la barra fija que ya
 * no existe. Resultado: un hueco enorme arriba y la pantalla flotando.
 *
 * Ahora es lo mismo que el resto de la aplicación: rótulo, título, contenido.
 * Sin tarjeta y sin sombra — la jerarquía la marcan la letra y las líneas, no
 * una caja levantada del fondo.
 *
 * `icon` se sigue aceptando para no romper a quien lo pasa, pero no se dibuja:
 * cada pantalla tenía un icono dentro de un cuadro de color distinto —morado,
 * azul, verde— y era el único sitio del sistema donde aparecían esos colores.
 */
export function ProfilePageShell({
    title,
    rotulo,
    count,
    backPath = "/profile",
    children,
}: ProfilePageShellProps) {
    const t = useTranslations();

    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            <div className="mb-5 flex items-start gap-3">
                <Link
                    href={backPath}
                    aria-label={t("profilePages.shell.back")}
                    className="pv-toque -ml-2 mt-0.5 flex size-8 shrink-0 items-center justify-center text-pv-tinta-suave transition-colors hover:text-pv-azul"
                >
                    <Icon icon="lucide:arrow-left" className="size-4" aria-hidden />
                </Link>
                <div className="min-w-0">
                    {rotulo && <p className="pv-rotulo">{rotulo}</p>}
                    <h1 className="pv-titulo text-2xl">{title}</h1>
                    {count !== undefined && (
                        <p className="mt-0.5 text-sm text-pv-tinta-suave">
                            {t("profilePages.shell.itemsCount", { count })}
                        </p>
                    )}
                </div>
            </div>

            {children}
        </div>
    );
}
