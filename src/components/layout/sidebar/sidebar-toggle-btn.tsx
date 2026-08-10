"use client";

import { IconSiderbar } from "@/components/icons/iconify";
import { useSidebarStore } from "@/stores/store.sidebar";
import { Button } from "@heroui/react";
import { useState, useEffect } from 'react';

export function SidebarToggleButton() {
    // client-aware desktop detector: starts false to match server-render
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(min-width: 1024px)');
        const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop(e.matches);
        setIsDesktop(mq.matches);
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange as any);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', onChange as any);
            else mq.removeListener(onChange as any);
        };
    }, []);
    const {
        isOpenDesktop,
        isOpenMobile,
        toggleDesktop,
        toggleMobile,
    } = useSidebarStore();

    const isOpen = isDesktop ? isOpenDesktop : isOpenMobile;
    const onToggle = isDesktop ? toggleDesktop : toggleMobile;

    return (
        <Button
            isIconOnly
            className="border-0"
            size="lg"
            variant="ghost"
            color="default"
            onPress={onToggle}
            aria-label={isOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
        >
            <IconSiderbar className="size-9" />
        </Button>
    );
}
