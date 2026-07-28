'use client'

import { LogoutModalProvider } from '@/components/layout/navbar/LogoutModalProvider';
import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from "@heroui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <ToastProvider />
            <LogoutModalProvider>
                {children}
            </LogoutModalProvider>
        </HeroUIProvider>
    )
}