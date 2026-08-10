"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, ScrollShadow, Skeleton } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { useRouter } from "next/navigation";
import { fetchOwnerInvoiceIncome } from "@/app/(user)/profile/_actions";
import { useTranslations } from "next-intl";

function toUIStatus(s: string): "paid" | "pending" | "overdue" | "cancelled" {
    const lower = s.toLowerCase();
    if (lower === "paid") return "paid";
    if (lower === "overdue") return "overdue";
    if (lower === "cancelled" || lower === "failed" || lower === "refunded") return "cancelled";
    return "pending";
}

function getStatusColor(status: string) {
    switch (status) {
        case "paid": return "success";
        case "pending": return "warning";
        case "cancelled": return "danger";
        case "overdue": return "danger";
        default: return "default";
    }
}

function InvoiceSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
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

export function OwnerInvoicesCard() {
    const router = useRouter();
    const t = useTranslations();
    const ownerInvoices = useProfileDataStore((s) => s.ownerInvoices);
    const setOwnerInvoices = useProfileDataStore((s) => s.setOwnerInvoices);
    const [isCardLoading, setIsCardLoading] = useState(true);

    useEffect(() => {
        fetchOwnerInvoiceIncome().then(({ data }) => {
            if (data) {
                setOwnerInvoices(
                    data.map((inv) => ({
                        id: String(inv.id),
                        invoiceNumber: inv.invoiceNumber,
                        description: inv.description,
                        amount: inv.amount / 100,
                        date: new Date(inv.issuedAt),
                        dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
                        status: toUIStatus(inv.status),
                        propertyName: inv.description ?? inv.invoiceNumber ?? "—",
                        propertyAddress: "—",
                        currency: inv.currency,
                        category: "rental" as const,
                        paymentMethod: "—",
                        period: undefined,
                    }))
                );
            }
            setIsCardLoading(false);
        });
    }, [setOwnerInvoices]);

    const initialInvoices = ownerInvoices.slice(0, 5);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-sm">
                        <Icons.moneyBill className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">Ingresos</h3>
                        {isCardLoading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: initialInvoices.length, total: ownerInvoices.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-amber-600 dark:text-amber-400 font-medium text-xs" onPress={() => router.push("/profile/invoices")}>
                    {t('cards.viewAll')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <ScrollShadow hideScrollBar className="max-h-52">
                    {isCardLoading ? (
                        <InvoiceSkeleton />
                    ) : initialInvoices.length > 0 ? (
                        <div className="space-y-2">
                            {initialInvoices.map((invoice) => (
                                <div key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm hover:bg-gray-100 dark:hover:bg-amber-900/20 transition-colors cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-black dark:text-white truncate">{invoice.propertyName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right ml-3 shrink-0">
                                        <p className="font-bold text-amber-600 dark:text-amber-400">{invoice.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
                                        <Chip radius="sm" size="sm" color={getStatusColor(invoice.status)} variant="flat" className="text-xs opacity-80">
                                            {t.has(`cards.invoiceStatus.${invoice.status}`) ? t(`cards.invoiceStatus.${invoice.status}`) : invoice.status}
                                        </Chip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">Sin ingresos registrados</p>
                    )}
                </ScrollShadow>
            </CardBody>
        </Card>
    );
}
