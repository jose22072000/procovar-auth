"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, ScrollShadow, Skeleton } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

function getStatusColor(status: string) {
    switch (status) {
        case "active": return "success";
        case "expired": return "danger";
        default: return "default";
    }
}

function getStatusLabel(status: string) {
    const map: Record<string, string> = {
        active: "Active",
        expired: "Expired",
    };
    return map[status] || status;
}

function ServiceSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <Skeleton className="h-4 w-32 rounded-sm" />
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-sm" />
                    </div>
                    <Skeleton className="h-3 w-28 rounded-sm mt-2" />
                </div>
            ))}
        </div>
    );
}

export function ServicesCard() {
    const router = useRouter();
    const t = useTranslations();
    const { services } = useProfileDataStore();
    const [isCardLoading, setIsCardLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsCardLoading(false), 1400);
        return () => clearTimeout(timer);
    }, []);

    const initialServices = services.slice(0, 5);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-sm">
                        <Icons.service className="size-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('cards.services')}</h3>
                        {isCardLoading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: initialServices.length, total: services.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium text-xs" onPress={() => router.push("/profile/services")}>{t('cards.viewAll')}</Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <ScrollShadow hideScrollBar className="max-h-52">
                    {isCardLoading ? (
                        <ServiceSkeleton />
                    ) : initialServices.length > 0 ? (
                        <div className="space-y-2">
                            {initialServices.map((service) => (
                                <div key={service.id} onClick={() => router.push(`/profile/services/${service.id}`)} className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm hover:bg-gray-100 dark:hover:bg-blue-800 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-black dark:text-white truncate">{service.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{service.propertyName}</p>
                                        </div>
                                        <Chip radius="sm" size="sm" color={getStatusColor(service.status)} variant="flat" className="text-xs shrink-0 ml-2">
                                            {t.has(`cards.serviceStatus.${service.status}`) ? t(`cards.serviceStatus.${service.status}`) : service.status}
                                        </Chip>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('cards.nextPayment')}: {service.nextPayment}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('cards.noServices')}</p>
                    )}
                </ScrollShadow>
            </CardBody>
        </Card>
    );
}
