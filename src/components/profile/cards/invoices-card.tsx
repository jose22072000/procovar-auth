"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, ScrollShadow, Skeleton } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { useRouter } from "next/navigation";
import { fetchUserInvoices } from "@/app/(user)/profile/_actions";
import { useTranslations } from "next-intl";

function toUIStatus(s: string): "paid" | "pending" | "overdue" | "cancelled" | "refund_requested" | "refunded" {
    const lower = s.toLowerCase();
    if (lower === "paid") return "paid";
    if (lower === "overdue") return "overdue";
    if (lower === "refund_requested") return "refund_requested";
    if (lower === "refunded") return "refunded";
    if (lower === "cancelled" || lower === "failed") return "cancelled";
    return "pending";
}

function getStatusColor(status: string) {
    switch (status) {
        case "paid": return "success";
        case "pending": return "warning";
        case "cancelled": return "danger";
        case "overdue": return "danger";
        case "refund_requested": return "warning";
        case "refunded": return "primary";
        default: return "default";
    }
}

function mapInvoice(inv: any) {
    return {
        id: String(inv.id),
        invoiceNumber: inv.invoiceNumber ?? "",
        description: inv.description ?? "",
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
    };
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

export function InvoicesCard() {
    const router = useRouter();
    const t = useTranslations();
    const invoices = useProfileDataStore((s) => s.invoices);
    const setInvoices = useProfileDataStore((s) => s.setInvoices);
    const [isCardLoading, setIsCardLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const { data } = await fetchUserInvoices();
            if (data) setInvoices(data.map(mapInvoice));
            setIsCardLoading(false);
        };
        load();
    }, [setInvoices]);

    type Tagged = { id: string; propertyName: string; amount: number; date: Date | string; status: string; invoiceType: "gasto" | "ingreso" };

    const combined: Tagged[] = invoices.map((inv) => ({ ...inv, invoiceType: "gasto" as const }));

    const displayed = combined.slice(0, 5);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-slate-800 rounded-sm">
                        <Icons.moneyBill className="size-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('cards.invoices')}</h3>
                        {isCardLoading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: displayed.length, total: combined.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium text-xs" onPress={() => router.push("/profile/invoices")}>
                    {t('cards.viewAll')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <ScrollShadow hideScrollBar className="max-h-52">
                    {isCardLoading ? (
                        <InvoiceSkeleton />
                    ) : displayed.length > 0 ? (
                        <div className="space-y-2">
                            {displayed.map((invoice) => {
                                const isIngreso = invoice.invoiceType === "ingreso";
                                return (
                                    <div
                                        key={`${isIngreso ? "i" : "g"}-${invoice.id}`}
                                        onClick={() => router.push(`/profile/invoices/${invoice.id}`)}
                                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/40 rounded-sm hover:bg-gray-100 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-black dark:text-white truncate">{invoice.propertyName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(invoice.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right ml-3 shrink-0">
                                            <p className={`font-bold ${isIngreso ? "text-amber-600 dark:text-amber-400" : "text-black dark:text-white"}`}>
                                                {isIngreso ? "+" : ""}{invoice.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                                            </p>
                                            <Chip radius="sm" size="sm" color={getStatusColor(invoice.status)} variant="flat" className="text-xs opacity-80">
                                                {t.has(`cards.invoiceStatus.${invoice.status}`) ? t(`cards.invoiceStatus.${invoice.status}`) : invoice.status}
                                            </Chip>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('cards.noInvoices')}</p>
                    )}
                </ScrollShadow>
            </CardBody>
        </Card>
    );
}
