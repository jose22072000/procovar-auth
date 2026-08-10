"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";

interface ProfilePageShellProps {
    title: string;
    icon: React.ReactNode;
    count?: number;
    backPath?: string;
    children: React.ReactNode;
}

export function ProfilePageShell({
    title,
    icon,
    count,
    backPath = "/profile",
    children,
}: ProfilePageShellProps) {
    const router = useRouter();
    const t = useTranslations();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto pt-16 md:pt-20 lg:pt-24 pb-6 md:pb-8 px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl">
                <Card className="bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/50 dark:shadow-none rounded-sm md:rounded-sm">
                    <CardHeader className="flex justify-between items-center p-3 md:p-5 pb-2 md:pb-3">
                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={() => router.push(backPath)}
                                className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                            >
                                <Icons.arrowLeft className="size-4 md:size-5 text-blue-600 dark:text-blue-300" />
                            </button>
                            {icon}
                            <div>
                                <h1 className="text-lg md:text-xl font-bold text-black dark:text-white">{title}</h1>
                                {count !== undefined && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('profilePages.shell.itemsCount', { count })}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody className="pt-1 md:pt-2 px-2 md:px-5 pb-4 md:pb-5">
                        {children}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
