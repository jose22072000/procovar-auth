"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Chip, Input } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { fetchUserInvoices } from "../_actions";
import { currencySymbol } from "@/lib/reservation-format";

type InvoiceUIStatus = "paid" | "pending" | "overdue" | "cancelled" | "refund_requested" | "refunded";

function toUIStatus(s: string): InvoiceUIStatus {
    const lower = s.toLowerCase();
    if (lower === "paid") return "paid";
    if (lower === "overdue") return "overdue";
    if (lower === "refund_requested") return "refund_requested";
    if (lower === "refunded") return "refunded";
    if (lower === "cancelled" || lower === "failed") return "cancelled";
    return "pending";
}

const statusColor: Record<InvoiceUIStatus, "success" | "warning" | "danger" | "default" | "primary"> = {
    paid: "success",
    pending: "warning",
    overdue: "danger",
    cancelled: "default",
    refund_requested: "warning",
    refunded: "primary",
};

export default function InvoicesPage() {
    const router = useRouter();
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const invoices = useProfileDataStore((s) => s.invoices);
    const setInvoices = useProfileDataStore((s) => s.setInvoices);

    useEffect(() => {
        fetchUserInvoices().then(({ data }) => {
            setInvoices(
                (data ?? []).map((inv) => ({
                    id: String(inv.id),
                    invoiceNumber: inv.invoiceNumber ?? "",
                    description: inv.description ?? "",
                    amount: inv.amount / 100,
                    date: new Date(inv.issuedAt),
                    dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
                    status: toUIStatus(inv.status),
                    propertyName: inv.propertyName ?? "—",
                    propertyAddress: inv.propertyAddress ?? "—",
                    currency: inv.currency,
                    category: "rental" as const,
                    paymentMethod: "—",
                    period: undefined,
                }))
            );
            setLoading(false);
        });
    }, [setInvoices]);

    const filtered = invoices.filter(
        (inv) =>
            inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            inv.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProfilePageShell
            title={t("profilePages.invoices.title")}
            icon={
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-sm">
                    <Icons.moneyBill className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
            }
            count={filtered.length}
        >
            <div className="mb-4">
                <Input
                    placeholder={t("profilePages.invoices.searchPlaceholder")}
                    value={search}
                    onValueChange={setSearch}
                    startContent={<Icons.search className="size-4 text-gray-400" />}
                    size="sm"
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-800" }}
                />
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-400">{t("profilePages.invoices.loading")}</div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((inv) => (
                        <div
                            key={inv.id}
                            onClick={() => router.push(`/profile/invoices/${inv.id}`)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-sm shrink-0">
                                    <Icons.moneyBill className="size-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                                        {inv.propertyName && inv.propertyName !== "—" ? inv.propertyName : inv.description}
                                    </p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{inv.invoiceNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {currencySymbol(inv.currency)}{inv.amount.toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">
                                        {inv.date instanceof Date
                                            ? inv.date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
                                            : String(inv.date)}
                                    </span>
                                    <Chip radius="sm" size="sm" color={statusColor[inv.status]} variant="flat" className="text-xs">
                                        {t(`profilePages.invoices.status.${inv.status}`)}
                                    </Chip>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400">{t("profilePages.invoices.empty")}</div>
                    )}
                </div>
            )}
        </ProfilePageShell>
    );
}
