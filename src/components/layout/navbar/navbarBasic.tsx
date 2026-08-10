"use client";
import { useState, useRef, useEffect } from "react";
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    Link,
    NavbarProps,
    cn,
    NavbarMenu,
    NavbarMenuItem,
    NavbarMenuToggle,
} from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useNavbarBasic } from "./useNavbarBasic";
import { UserNavbarBasic } from "./userNavbarBasic";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { setLocale } from "@/server/locale.server";
import type { Locale } from "@/i18n/config";
import { NotificationBell } from "./notification-bell";

type NavBarBasicProps = Omit<NavbarProps, "children"> & { bookingUrl?: string; panelUrl?: string };

export const NavBarBasic = ({ bookingUrl: bookingUrlProp, panelUrl: panelUrlProp, ...props }: NavBarBasicProps) => {
    const { isMenuOpen, setIsMenuOpen } = useNavbarBasic();
    const pathName = usePathname();
    const t = useTranslations();
    const lang = useLocale() as Locale;
    // Server action: writes the NEXT_LOCALE cookie and revalidates the layout,
    // so server-rendered text switches too.
    const setLang = (l: Locale) => { void setLocale(l); };
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

    const bookingUrl = bookingUrlProp ?? '/';
    const panelUrl = panelUrlProp ?? 'https://qb-dashboard.hostravel.net';

    const handleStaysClick = (e: React.MouseEvent) => {
        e.preventDefault();
        window.location.href = bookingUrl;
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { id: "stays", label: t('nav.findStays'), icon: Icons.bed, href: bookingUrl },
        { id: "about", label: t('nav.about'), icon: Icons.info, href: `${bookingUrl}/aboutUs` },
        { id: "contact", label: t('nav.contact'), icon: Icons.contact, href: `${bookingUrl}/contact` },
        { id: "property", label: t('nav.listProperty'), icon: Icons.property, href: panelUrl },
    ];

    return (
        <Navbar
            maxWidth="full"
            className="bg-[#0A2252] fixed top-0 left-0 right-0 z-50 py-3 md:py-4"
            classNames={{
                wrapper: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 lg:h-14",
            }}
            {...props}
            onMenuOpenChange={setIsMenuOpen}
            isMenuOpen={isMenuOpen}
        >
            <NavbarContent as="div" justify="start">
                <div className="flex justify-center items-center lg:hidden">
                    <NavbarMenuToggle
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        className="size-8"
                    />
                </div>
                <NavbarBrand as={Link} href="/" className="mr-4 w-fit max-w-fit flex items-center gap-2">
                    <Image
                        src="/hostravel-icon.png"
                        alt="Hostravel icon"
                        width={40}
                        height={42}
                        className="block lg:hidden h-11 w-auto object-contain"
                        priority
                    />
                    <Image
                        src="/hostravel-logo.png"
                        alt="Hostravel"
                        width={190}
                        height={52}
                        className="hidden lg:block h-14 w-auto object-contain"
                        priority
                    />
                </NavbarBrand>
                <NavbarContent justify="center" className="hidden lg:flex gap-0 lg:flex-grow lg:flex-1">
                    {navItems.map((item) => (
                        <NavbarItem key={item.id} isActive={pathName === item.href}>
                            {item.id === "stays" ? (
                                <button
                                    type="button"
                                    onClick={handleStaysClick}
                                    className={cn(
                                        "font-semibold flex items-center justify-center gap-2 rounded-sm px-4 py-2 border border-transparent hover:bg-white/10 hover:border-white/25 text-white",
                                    )}
                                >
                                    <item.icon className="size-5" />
                                    {item.label}
                                </button>
                            ) : (
                                <Link
                                    className={cn(
                                        "font-semibold flex items-center justify-center gap-2 rounded-sm px-4 py-2 border border-transparent hover:bg-white/10 hover:border-white/25 text-white",
                                        pathName === item.href && "font-bold bg-white/10 border-white/25"
                                    )}
                                    href={item.href}
                                >
                                    <item.icon className="size-5" />
                                    {item.label}
                                </Link>
                            )}
                        </NavbarItem>
                    ))}
                </NavbarContent>
            </NavbarContent>

            <NavbarContent as="div" className="items-center w-fit max-w-fit gap-4" justify="end">
                <div className="relative" ref={langRef}>
                    <button
                        type="button"
                        className="inline-flex h-10 w-auto min-w-[30px] items-center gap-1.5 rounded-sm border border-white/25 bg-transparent px-[6px] font-semibold text-white hover:bg-white/10"
                        style={{ minWidth: "30px", paddingInline: "6px" }}
                        aria-label="Switch language"
                        aria-expanded={langOpen}
                        onClick={() => setLangOpen((o) => !o)}
                    >
                        {lang.toUpperCase()}
                        <Icons.chevronDown className={cn("size-4 transition-transform", langOpen && "rotate-180")} />
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 mt-1 bg-[#0A2252] border border-white/20 rounded-md shadow-xl z-[200] min-w-[150px] overflow-hidden">
                            {(["en", "es"] as const).map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => { setLang(l); setLangOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 flex items-center justify-between gap-2",
                                        lang === l && "bg-white/5 font-semibold"
                                    )}
                                >
                                    <span>{l === "en" ? "EN — English" : "ES — Español"}</span>
                                    {lang === l && <Icons.checkCircle className="size-4 opacity-60" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <NotificationBell />
                <UserNavbarBasic />
            </NavbarContent>
            <NavbarMenu className="bg-[#0A2252]/95 backdrop-blur-md">
                {navItems.map((item) => (
                    <NavbarMenuItem key={item.id} isActive={pathName === item.href}>
                        {item.id === "stays" ? (
                            <button
                                type="button"
                                onClick={handleStaysClick}
                                className={cn(
                                    "font-semibold flex items-center justify-start gap-2 rounded-sm px-2 py-4 text-white w-full"
                                )}
                            >
                                <item.icon className="size-5" />
                                {item.label}
                            </button>
                        ) : (
                            <Link
                                className={cn(
                                    "font-semibold flex items-center justify-start gap-2 rounded-sm px-2 py-4 text-white",
                                    pathName === item.href && "font-bold"
                                )}
                                href={item.href}
                            >
                                <item.icon className="size-5" />
                                {item.label}
                            </Link>
                        )}
                    </NavbarMenuItem>
                ))}
            </NavbarMenu>
        </Navbar>
    );
};
