"use client";
import React from "react";
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
import logoSrc from "@/assets/logo.png";

type NavBarBasicProps = Omit<NavbarProps, "children">;

/**
 * Navigation items configuration
 */
const navItems = [
    { id: "stays", label: "Find Stays", icon: Icons.bed, href: "https://dozzze.es" },
    { id: "about", label: "About", icon: Icons.info, href: "https://dozzze.es" },
    { id: "contact", label: "Contact", icon: Icons.contact, href: "https://dozzze.es" },
    { id: "property", label: "List your property", icon: Icons.property, href: "https://dozzze.es" },
];

export const NavBarBasic = (props: NavBarBasicProps) => {
    const { isMenuOpen, setIsMenuOpen } = useNavbarBasic();
    const pathName = usePathname();
    return (
        <Navbar maxWidth="2xl" className="bg-primary/10 backdrop-saturate-50 fixed top-0 left-0 right-0 z-50" {...props} onMenuOpenChange={setIsMenuOpen} isMenuOpen={isMenuOpen}>
            <NavbarContent as="div" justify="start">
                <div className="flex justify-center items-center lg:hidden">
                    <NavbarMenuToggle
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        className="size-8"
                    />
                </div>
                <NavbarBrand as={Link} href="/" className="mr-4 w-fit max-w-fit flex items-center gap-2">
                    <Image src={logoSrc} alt="DozZze Logo" className="size-6 sm:size-8" />
                    <span className="font-bold text-lg sm:text-2xl text-white">DozZze</span>
                </NavbarBrand>
                <NavbarContent justify="center" className="hidden lg:flex gap-0 lg:flex-grow lg:flex-1">
                    {navItems.map((item) => (
                        <NavbarItem key={item.id} isActive={pathName === item.href}>
                            <Link
                                color="foreground"
                                className={cn(
                                    "font-semibold flex items-center justify-center gap-2 rounded px-4 py-2 rounded-full border border-transparent hover:bg-white/10 hover:border-white/25",
                                    pathName === item.href && "font-bold bg-white/10 border-white/25"
                                )}
                                href={item.href}
                            >
                                <item.icon className="size-5" />
                                {item.label}
                            </Link>
                        </NavbarItem>
                    ))}
                </NavbarContent>
            </NavbarContent>

            <NavbarContent as="div" className="items-center w-fit max-w-fit" justify="end">
                <UserNavbarBasic />
            </NavbarContent>
            <NavbarMenu >
                {navItems.map((item) => (
                    <NavbarMenuItem key={item.id} isActive={pathName === item.href}>
                        <Link
                            color="foreground"
                            className={cn(
                                "font-semibold flex items-center justify-start gap-2 rounded px-2 py-4",
                                pathName === item.href && "font-bold text-primary-500"
                            )}
                            href={item.href}
                        >
                            <item.icon className="size-5" />
                            {item.label}
                        </Link>
                    </NavbarMenuItem>
                ))}
            </NavbarMenu>
        </Navbar>
    );
};