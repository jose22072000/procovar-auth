"use client";
import { useState, useRef, useEffect } from "react";
import { Navbar, NavbarBrand, NavbarContent, Link, NavbarProps } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useNavbarBasic } from "./useNavbarBasic";
import { UserNavbarBasic } from "./userNavbarBasic";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/server/locale.server";
import type { Locale } from "@/i18n/config";
import { NotificationBell } from "./notification-bell";

type NavBarBasicProps = Omit<NavbarProps, "children">;

/**
 * La barra de arriba.
 *
 * Esto es el centro de accesos: se entra, se sale y se gestiona la cuenta. No
 * hay adónde navegar desde aquí, así que la barra no lleva menú — solo la marca,
 * el idioma, los avisos y la persona. Antes tenía "buscar alojamientos", "sobre
 * nosotros" y "publicar propiedad", que eran de la web de reservas del producto
 * del que salió este código y apuntaban a sitios que aquí no existen.
 */
export const NavBarBasic = ({ ...props }: NavBarBasicProps) => {
    const { isMenuOpen, setIsMenuOpen } = useNavbarBasic();
    const t = useTranslations();
    const lang = useLocale() as Locale;
    const setLang = (l: Locale) => { void setLocale(l); };
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fuera = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
        };
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, []);

    return (
        <Navbar
            maxWidth="full"
            className="bg-pv-azul-hondo fixed top-0 left-0 right-0 z-50"
            classNames={{ wrapper: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14" }}
            {...props}
            onMenuOpenChange={setIsMenuOpen}
            isMenuOpen={isMenuOpen}
        >
            <NavbarContent as="div" justify="start">
                <NavbarBrand as={Link} href="/" className="w-fit max-w-fit items-center gap-2.5">
                    {/* El isotipo en pantallas pequeñas, el logotipo entero a
                        partir de tableta: el nombre completo no cabe en un móvil
                        sin comerse el sitio de los avisos y la cuenta. */}
                    <Image
                        src="/logo-512.png"
                        alt=""
                        width={30}
                        height={30}
                        className="h-7 w-7 rounded-[2px] object-contain sm:hidden"
                        priority
                    />
                    <Image
                        src="/logo.png"
                        alt="Procovar"
                        width={168}
                        height={34}
                        className="hidden h-6 w-auto object-contain sm:block"
                        priority
                    />
                    <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-white/55 md:inline">
                        {t("navbar.section")}
                    </span>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent as="div" justify="end" className="gap-1.5">
                <div ref={langRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setLangOpen((v) => !v)}
                        aria-expanded={langOpen}
                        aria-label={t("navbar.language")}
                        className="flex items-center gap-1 rounded-[3px] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        {lang}
                        <Icons.chevronDown className="size-3.5" />
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 top-full mt-1 min-w-[104px] overflow-hidden rounded-[3px] border border-pv-trazo bg-pv-blanco py-1 shadow-lg">
                            {(["es", "en"] as Locale[]).map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => { setLang(l); setLangOpen(false); }}
                                    className={
                                        "block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-pv-azul-tinte " +
                                        (l === lang ? "font-semibold text-pv-azul" : "text-pv-tinta")
                                    }
                                >
                                    {l === "es" ? "Español" : "English"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <NotificationBell />
                <UserNavbarBasic />
            </NavbarContent>
        </Navbar>
    );
};
