"use client";

import { LogoAgenda } from "@/components/icons/iconify";
import { useSidebarStore } from "@/stores/store.sidebar";
import { Drawer, DrawerContent } from "@heroui/drawer";
import { Link } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from 'react';

export function SidebarCalendario({ children, menu }: { children: React.ReactNode, menu: React.ReactNode }) {
    const {
        isOpenDesktop,
        isOpenMobile,
        closeDesktop,
        closeMobile,
    } = useSidebarStore();
    // defaultMatches:false ensures server and initial client render the same (avoids hydration mismatch)
    // custom client-aware desktop detector:
    // start false (same as server), then set based on matchMedia after mount
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop(e.matches);
        // initialize
        setIsDesktop(mq.matches);
        // listen for changes
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange as any);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', onChange as any);
            else mq.removeListener(onChange as any);
        };
    }, []);
    const isOpen = isDesktop ? isOpenDesktop : isOpenMobile;
    const close = isDesktop ? closeDesktop : closeMobile;

    // Always render the same outer structure to avoid hydration mismatches.
    // Inside we branch between Drawer (mobile) and aside (desktop).
    return (
        <div className="flex h-screen w-full overflow-hidden">
            <AnimatePresence initial={false}>
                {isDesktop ? (
                    // Desktop: animated aside
                    isOpen && (
                        <motion.aside
                            key="sidebar"
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }} // ancho del sidebar
                            transition={{ duration: 0.3 }}
                            className="fixed left-0 top-0 w-80 text-foreground pl-4 py-4 z-20 h-screen"
                        >
                            <div className="bg-content2/35 border-2 border-gray-100/10 backdrop-blur-xl h-full overflow-y-auto rounded-xl p-4 shadow-lg">
                                <div className="text-xl font-bold mb-6 flex items-center"><Link href="/" className="flex items-center gap-2" color="foreground"><LogoAgenda className="size-9" /> ProCovar Auth</Link></div>
                                {menu}
                            </div>
                        </motion.aside>
                    )
                ) : (
                    // Mobile: Drawer component
                    <Drawer
                        isOpen={isOpen}
                        onClose={close}
                        placement="left"
                        backdrop="blur"
                    >
                        <DrawerContent className="p-4">
                            <h2 className="text-xl font-bold mb-6">ProCovar Auth</h2>
                            {menu}
                        </DrawerContent>
                    </Drawer>
                )}
            </AnimatePresence>

            {/* Contenido principal con desplazamiento */}
            <motion.div
                initial={false}
                animate={{ marginLeft: isDesktop && isOpen ? 320 : 0 }} // only push on desktop when opened
                transition={{ duration: 0.3 }}
                className="flex-1 h-screen overflow-y-auto"
            >
                {children}
            </motion.div>
        </div>
    );
}
