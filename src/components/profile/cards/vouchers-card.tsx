"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, ScrollShadow, Skeleton } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchUserVouchers, type CustomerVoucherView } from "@/app/(user)/profile/_actions";
import { currencySymbol } from "@/lib/reservation-format";

type VoucherUIStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";

const statusColor: Record<VoucherUIStatus, "success" | "default" | "danger" | "warning"> = {
    ACTIVE: "success",
    USED: "default",
    EXPIRED: "warning",
    CANCELLED: "danger",
};

function VoucherSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-32 rounded-sm" />
                        <Skeleton className="h-3 w-20 rounded-sm mt-1" />
                    </div>
                    <div className="text-right ml-3 shrink-0">
                        <Skeleton className="h-4 w-16 rounded-sm" />
                        <Skeleton className="h-5 w-14 rounded-sm mt-1" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// This card self-fetches (not the persisted Zustand profile-data store —
// vouchers are a new, small dataset; adding it to that store would mean
// another version bump/migration for no real benefit here).
export function VouchersCard() {
    const router = useRouter();
    const t = useTranslations();
    const [vouchers, setVouchers] = useState<CustomerVoucherView[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        fetchUserVouchers().then(({ data }) => {
            if (!active) return;
            setVouchers(data ?? []);
            setIsLoading(false);
        });
        return () => { active = false; };
    }, []);

    const displayed = vouchers.slice(0, 5);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-sm">
                        <Icons.voucher className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('cards.vouchers')}</h3>
                        {isLoading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: displayed.length, total: vouchers.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium text-xs" onPress={() => router.push("/profile/vouchers")}>
                    {t('cards.viewAll')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <ScrollShadow hideScrollBar className="max-h-52">
                    {isLoading ? (
                        <VoucherSkeleton />
                    ) : displayed.length > 0 ? (
                        <div className="space-y-2">
                            {displayed.map((v) => {
                                const status = v.status as VoucherUIStatus;
                                const symbol = currencySymbol(v.currency);
                                return (
                                    <div
                                        key={v.id}
                                        onClick={() => router.push("/profile/vouchers")}
                                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm hover:bg-gray-100 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-black dark:text-white truncate">{v.organizationName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.reason}</p>
                                        </div>
                                        <div className="text-right ml-3 shrink-0">
                                            <p className="font-bold text-black dark:text-white">
                                                {symbol}{(v.remaining / 100).toLocaleString()}
                                            </p>
                                            <Chip radius="sm" size="sm" color={statusColor[status]} variant="flat" className="text-xs opacity-80">
                                                {t.has(`profilePages.vouchers.status.${status}`) ? t(`profilePages.vouchers.status.${status}`) : status}
                                            </Chip>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('cards.noVouchers')}</p>
                    )}
                </ScrollShadow>
            </CardBody>
        </Card>
    );
}
