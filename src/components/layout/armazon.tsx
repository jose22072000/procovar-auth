"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/server/locale.server";
import type { Locale } from "@/i18n/config";

export interface Persona {
    nombre: string;
    correo: string;
    esSuperAdmin: boolean;
    /** Código de la sucursal en la que trabaja, o "TODAS" para el Super Admin. */
    alcance: string | null;
    /** Si lleva alguna sucursal, para enseñarle su panel. */
    llevaSucursal: boolean;
}

/**
 * El armazón de Procovar.
 *
 * # Por qué una barra lateral y no una de arriba
 *
 * Lo que había era una barra superior con el menú escondido dentro del avatar,
 * más una fila de pestañas debajo: dos niveles de navegación, ninguno visible de
 * un vistazo, y la mitad de las opciones enterradas a dos clics. Es la forma de
 * una web que vende a desconocidos, donde lo que importa es el contenido y la
 * navegación estorba.
 *
 * Esto es lo contrario: una herramienta de trabajo donde se salta de las
 * sucursales a la gente y de la gente a los permisos veinte veces al día. Todo
 * está a un clic y a la vista, siempre en el mismo sitio.
 *
 * # El alcance, arriba y fijo
 *
 * En la banda superior va el marco con la sucursal. No es adorno: casi todos los
 * líos de este sistema salen de no saber con qué alcance se está mirando.
 *
 * # En el móvil
 *
 * La barra se recoge y sale con el botón. No se convierte en una fila de iconos
 * abajo: los apartados tienen nombres que hay que leer, y un icono de "roles y
 * permisos" no lo adivina nadie.
 */

interface Apartado {
    href: string;
    icono: string;
    texto: string;
    /** Solo para el Super Admin. */
    soloGlobal?: boolean;
    /** Solo para quien lleva alguna sucursal. */
    soloSucursal?: boolean;
}

export function Armazon({ persona, children }: { persona: Persona; children: React.ReactNode }) {
    const t = useTranslations();
    const ruta = usePathname();
    const idioma = useLocale() as Locale;
    const [abierta, setAbierta] = useState(false);

    const APARTADOS: Apartado[] = [
        { href: "/dashboard/organizations", icono: "lucide:building-2", texto: t("rail.sucursales"), soloGlobal: true },
        { href: "/profile/org", icono: "lucide:building-2", texto: t("rail.miSucursal"), soloSucursal: true },
        { href: "/dashboard/users", icono: "lucide:users", texto: t("rail.personas"), soloGlobal: true },
        { href: "/dashboard/permissions", icono: "lucide:shield-check", texto: t("rail.permisos"), soloGlobal: true },
        { href: "/dashboard/auditoria", icono: "lucide:scroll-text", texto: t("rail.auditoria"), soloGlobal: true },
        { href: "/apikeys", icono: "lucide:key-round", texto: t("rail.aplicaciones"), soloGlobal: true },
    ];

    const visibles = APARTADOS.filter((a) => {
        if (a.soloGlobal) return persona.esSuperAdmin;
        if (a.soloSucursal) return !persona.esSuperAdmin && persona.llevaSucursal;
        return true;
    });

    const barra = (
        <div className="pv-rail flex h-full w-56 shrink-0 flex-col">
            <div className="flex h-14 items-center gap-2.5 px-4">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setAbierta(false)}>
                    <Image src="/logo.png" alt="Procovar" width={150} height={30} className="h-5 w-auto object-contain" />
                </Link>
            </div>

            <nav className="mt-2 flex-1 overflow-y-auto py-1">
                {visibles.map((a) => (
                    <Link
                        key={a.href}
                        href={a.href}
                        onClick={() => setAbierta(false)}
                        className="pv-rail-enlace"
                        data-activo={ruta.startsWith(a.href)}
                    >
                        <Icon icon={a.icono} className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">{a.texto}</span>
                    </Link>
                ))}
            </nav>

            <div className="border-t border-white/10 p-3">
                <Link
                    href="/profile"
                    onClick={() => setAbierta(false)}
                    className="block min-w-0 rounded-none px-1 py-1 transition-colors hover:bg-white/[0.06]"
                >
                    <p className="truncate text-sm font-semibold text-white">{persona.nombre}</p>
                    <p className="truncate text-xs text-white/45">{persona.correo}</p>
                </Link>
                <Link
                    href="/logout"
                    onClick={() => setAbierta(false)}
                    className="mt-1.5 flex items-center gap-2 px-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/55 transition-colors hover:text-white"
                >
                    <Icon icon="lucide:log-out" className="size-3.5" aria-hidden />
                    {t("nav.logOut")}
                </Link>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-svh bg-pv-papel">
            {/* Fija en el escritorio */}
            <aside className="sticky top-0 hidden h-svh lg:block">{barra}</aside>

            {/* Cajón en el móvil */}
            {abierta && (
                <>
                    <button
                        type="button"
                        aria-label={t("rail.cerrarMenu")}
                        onClick={() => setAbierta(false)}
                        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    />
                    <aside className="fixed inset-y-0 left-0 z-50 h-svh lg:hidden">{barra}</aside>
                </>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-pv-trazo bg-pv-papel/95 px-4 backdrop-blur">
                    <button
                        type="button"
                        onClick={() => setAbierta(true)}
                        aria-label={t("rail.abrirMenu")}
                        className="pv-toque -ml-1 flex size-9 items-center justify-center text-pv-tinta lg:hidden"
                    >
                        <Icon icon="lucide:menu" className="size-5" aria-hidden />
                    </button>

                    {persona.alcance && (
                        <span className="pv-marco">
                            <span className="pv-rotulo">{t("cuenta.alcance")}</span>
                            <span className="pv-codigo font-semibold text-pv-azul">{persona.alcance}</span>
                        </span>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        {/* El idioma, sin desplegable: son dos. Un menú para elegir
                            entre dos cosas es un clic de más. */}
                        {(["es", "en"] as Locale[]).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => void setLocale(l)}
                                aria-current={l === idioma ? "true" : undefined}
                                className={
                                    "px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors " +
                                    (l === idioma
                                        ? "text-pv-azul underline underline-offset-4"
                                        : "text-pv-tinta-suave hover:text-pv-tinta")
                                }
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </header>

                <main className="min-w-0 flex-1">{children}</main>
            </div>
        </div>
    );
}
