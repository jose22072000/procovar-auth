"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useTranslations } from "next-intl";
import type { BackendProperty } from "@/app/(user)/profile/_actions";

interface PropertiesCardProps {
    properties: BackendProperty[];
    reservationCountByProperty: Record<string, number>;
    revenueByProperty: Record<string, number>;
    panelUrl: string;
    currency?: string;
}

export function PropertiesCard({
    properties,
    reservationCountByProperty,
    revenueByProperty,
    panelUrl,
    currency,
}: PropertiesCardProps) {
    const t = useTranslations();

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString("es-ES", { style: "currency", currency: currency ?? "EUR" });

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-sm">
                        <Icons.building className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white">{t('orgView.properties')}</h3>
                </div>
                <Button
                    as="a"
                    href={panelUrl}
                    target="_blank"
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-300 font-medium"
                >
                    {t('orgView.managePanelLink')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                {properties.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('orgView.noProperties')}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {properties.map((property) => {
                            const resCount = reservationCountByProperty[property.id] ?? 0;
                            const revenue = revenueByProperty[property.id] ?? 0;
                            return (
                                <div
                                    key={property.id}
                                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-white dark:bg-slate-700 rounded-sm border border-gray-100 dark:border-slate-600 shrink-0">
                                            <Icons.building className="size-3.5 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-black dark:text-white truncate text-sm">
                                                {property.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {resCount} {t('orgView.reservationsLabel')}
                                                {" · "}
                                                {fmt(revenue)}
                                            </p>
                                        </div>
                                    </div>
                                    <Chip
                                        size="sm"
                                        radius="sm"
                                        variant="flat"
                                        color={property.isLive ? "success" : "warning"}
                                    >
                                        {property.isLive ? t('orgView.statusLive') : t('orgView.statusDraft')}
                                    </Chip>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
