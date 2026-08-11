"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";

interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    isSystemAdmin?: boolean;
    createdAt: Date;
}

export interface Pertenencia {
    sucursal: string;
    codigo: string | null;
    roles: string[];
}

interface ProfileContentProps {
    user: User;
    /** Las sucursales de esta persona y el rol que tiene en cada una. */
    pertenencias: Pertenencia[];
}

/**
 * Mi cuenta.
 *
 * Enseña lo único que aquí importa de una persona: quién es y **dónde puede
 * trabajar**. Antes enseñaba reservas activas, estancias completadas y el gasto
 * total en euros: eran del producto de alojamientos del que salió este código.
 * En Procovar nadie gasta euros ni tiene estancias.
 *
 * "Dónde puede trabajar" no es un adorno: es la primera pregunta cuando algo no
 * deja hacer algo, y hasta ahora había que ir a buscarla al panel.
 */
export function ProfileContent({ user, pertenencias }: ProfileContentProps) {
    const t = useTranslations();
    const inicial = user.name?.[0]?.toUpperCase() || "?";

    return (
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
            <div>
                <p className="pv-rotulo">{t("navbar.section")}</p>
                <h1 className="pv-titulo text-2xl">{t("profile.title")}</h1>
            </div>

            <div className="pv-ficha">
                <div className="flex flex-wrap items-center gap-4 p-5">
                    {/* El avatar es la única cosa redonda del sistema: es una cara. */}
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pv-azul text-xl font-bold text-white">
                        {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.image}
                                alt=""
                                className="size-14 object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            inicial
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="pv-titulo truncate text-lg">{user.name}</h2>
                        <p className="truncate text-sm text-pv-tinta-suave">{user.email}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {user.isSystemAdmin && (
                                <span className="pv-etiqueta pv-etiqueta-azul">Super Admin</span>
                            )}
                            <span
                                className={
                                    "pv-etiqueta " +
                                    (user.emailVerified ? "pv-etiqueta-visto" : "pv-etiqueta-ambar")
                                }
                            >
                                {user.emailVerified
                                    ? t("profile.emailVerified")
                                    : t("profile.emailNotVerified")}
                            </span>
                        </div>
                    </div>

                    <Link
                        href="/profile/me"
                        className="pv-toque inline-flex shrink-0 items-center gap-2 bg-pv-azul px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pv-azul-hondo"
                    >
                        <Icons.userCircle className="size-4" />
                        <span className="hidden sm:inline">{t("profile.settings")}</span>
                        <Icon icon="lucide:chevron-right" className="size-4" aria-hidden />
                    </Link>
                </div>
            </div>

            <div className="pv-ficha">
                <div className="pv-ficha-cabecera">
                    <Icon icon="lucide:building-2" className="size-4 text-pv-tinta-suave" aria-hidden />
                    <h2 className="text-sm font-semibold">{t("profile.myBranches")}</h2>
                </div>

                {user.isSystemAdmin ? (
                    // Un Super Admin no pertenece a ninguna sucursal: las ve todas.
                    // Decir "no tienes ninguna" seria mentirle al que mas puede.
                    <p className="px-4 py-5 text-sm text-pv-tinta-suave">
                        {t("profile.superAdminScope")}
                    </p>
                ) : pertenencias.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-pv-tinta-suave">
                        {t("profile.noBranches")}
                    </p>
                ) : (
                    <ul className="divide-y divide-pv-trazo-tenue">
                        {pertenencias.map((p) => (
                            <li key={p.sucursal} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                {p.codigo && (
                                    <span className="pv-etiqueta pv-etiqueta-gris">{p.codigo}</span>
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {p.sucursal}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {p.roles.map((r) => (
                                        <span key={r} className="pv-etiqueta pv-etiqueta-azul">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
