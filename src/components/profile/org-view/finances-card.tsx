"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BackendPayout } from "@/app/(user)/profile/_actions";

interface FinancesCardProps {
    payouts: BackendPayout[];
    monthlyIncomeCents: number;
    pendingRevenueCents?: number;
    pendingCount?: number;
}

export function FinancesCard({ payouts, monthlyIncomeCents, pendingRevenueCents = 0, pendingCount = 0 }: FinancesCardProps) {
    const t = useTranslations();
    const router = useRouter();

    const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
    const pendingAmountCents = pendingPayouts.reduce((sum, p) => sum + p.amount, 0) || pendingRevenueCents;
    const resolvedPendingCount = pendingPayouts.length || pendingCount;
    const currency = payouts[0]?.currency ?? "EUR";

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString("es-ES", { style: "currency", currency });

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-sm">
                        <Icons.moneyBill className="size-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-black dark:text-white">{t('orgView.finances')}</h3>
                </div>
                <Button
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-300 font-medium"
                    onPress={() => router.push("/profile/invoices")}
                >
                    {t('cards.viewAll')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5 space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('orgView.monthlyIncome')}</p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                        {fmt(monthlyIncomeCents)}
                    </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t('orgView.pendingPayouts')}</p>
                    <div className="flex items-center gap-2">
                        <Chip
                            size="sm"
                            radius="sm"
                            variant="flat"
                            color={resolvedPendingCount > 0 ? "warning" : "success"}
                        >
                            {resolvedPendingCount}
                        </Chip>
                        <p className="font-bold text-black dark:text-white">{fmt(pendingAmountCents ?? 0)}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
