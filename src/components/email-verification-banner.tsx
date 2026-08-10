"use client";

import { Button } from "@heroui/react";
import { Icons } from "./icons/iconify";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

type EmailVerificationBannerProps = {
    userEmail?: string;
    emailVerified?: boolean;
};

export function EmailVerificationBanner({ userEmail, emailVerified }: EmailVerificationBannerProps) {
    const t = useTranslations();
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Don't show if email is verified or banner is dismissed
    if (emailVerified || dismissed) {
        return null;
    }

    const handleResend = async () => {
        if (!userEmail || resendCooldown > 0) return;
        
        setIsResending(true);
        try {
            await authClient.sendVerificationEmail({
                email: userEmail,
                callbackURL: "/profile",
            });
            setResendCooldown(60); // 60 second cooldown
        } catch (error) {
            console.error("Failed to resend verification email:", error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-red-400 backdrop-blur-sm border-t border-white/10 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-danger-100">
                                <Icons.mailOutline className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-white">
                                <p className="font-semibold">{t('dashboard.emailBanner.title')}</p>
                                <p className="text-sm text-white/80">
                                    {t('dashboard.emailBanner.description')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="bordered"
                                className="border-white text-white hover:bg-white/10 font-semibold"
                                onPress={handleResend}
                                startContent={<Icons.mailOutline className="size-5" />}
                                isLoading={isResending}
                                isDisabled={resendCooldown > 0}
                            >
                                {resendCooldown > 0
                                    ? t('dashboard.emailBanner.resendCooldown', { seconds: resendCooldown })
                                    : t('dashboard.emailBanner.resend')
                                }
                            </Button>
                            <Button
                                size="sm"
                                isIconOnly
                                variant="light"
                                className="text-white/70 hover:text-white hover:bg-white/10"
                                onPress={() => setDismissed(true)}
                            >
                                <Icons.close className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
