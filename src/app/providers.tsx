'use client'

import { LogoutModalProvider } from '@/components/layout/navbar/LogoutModalProvider';
import { EmailVerificationProvider } from '@/components/email-verification-provider';
import { FullUserProvider } from '@/components/full-user-provider';
import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from "@heroui/toast";
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    return (
        <HeroUIProvider navigate={router.push}>
            <ToastProvider />
            <FullUserProvider>
                <LogoutModalProvider>
                    <EmailVerificationProvider>
                        {children}
                    </EmailVerificationProvider>
                </LogoutModalProvider>
            </FullUserProvider>
        </HeroUIProvider>
    )
}