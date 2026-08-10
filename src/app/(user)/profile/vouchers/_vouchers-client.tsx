"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Chip, Button } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { currencySymbol } from "@/lib/reservation-format";
import type { CustomerVoucherView } from "../_actions";

type VoucherUIStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";

const statusColor: Record<VoucherUIStatus, "success" | "default" | "danger" | "warning"> = {
    ACTIVE: "success",
    USED: "default",
    EXPIRED: "warning",
    CANCELLED: "danger",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function VouchersClient({ vouchers }: { vouchers: CustomerVoucherView[] }) {
    const t = useTranslations();
    // Gap 4 — per-reservation usage breakdown is collapsed by default (could
    // be a long list for a heavily-used voucher); tracked by voucher id since
    // several cards can be expanded independently.
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <ProfilePageShell
            title={t("profilePages.vouchers.title")}
            icon={
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm">
                    <Icons.voucher className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
            }
            count={vouchers.length}
        >
            {vouchers.length === 0 ? (
                <div className="py-12 text-center text-gray-400">{t("profilePages.vouchers.empty")}</div>
            ) : (
                <div className="grid gap-3">
                    {vouchers.map((v) => {
                        const status = v.status as VoucherUIStatus;
                        const symbol = currencySymbol(v.currency);
                        const usages = v.usages ?? [];
                        const isExpanded = expandedIds.has(v.id);
                        return (
                            <div
                                key={v.id}
                                className="p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm shrink-0">
                                            <Icons.voucher className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                {v.organizationName}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                {v.reason || t("profilePages.vouchers.noReason")}
                                            </p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                {t("profilePages.vouchers.validUntil", { date: formatDate(v.validUntil) })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                {symbol}{(v.remaining / 100).toLocaleString()}
                                                <span className="text-xs font-normal text-gray-400"> / {symbol}{(v.amount / 100).toLocaleString()}</span>
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                                {t("profilePages.vouchers.remainingOfAmount")}
                                            </p>
                                        </div>
                                        <Chip radius="sm" size="sm" color={statusColor[status]} variant="flat" className="text-xs">
                                            {t(`profilePages.vouchers.status.${status}`)}
                                        </Chip>
                                    </div>
                                </div>

                                {/* Gap 4 — per-reservation spend breakdown. Nothing shown when the voucher has no usages yet. */}
                                {usages.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                                        <Button
                                            size="sm"
                                            variant="light"
                                            className="h-6 min-w-0 px-1 text-xs text-blue-600 dark:text-blue-300 font-medium"
                                            onPress={() => toggleExpanded(v.id)}
                                            endContent={
                                                <Icons.chevronDown
                                                    className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                />
                                            }
                                        >
                                            {isExpanded
                                                ? t("profilePages.vouchers.hideUsages")
                                                : t("profilePages.vouchers.showUsages", { count: usages.length })}
                                        </Button>
                                        {isExpanded && (
                                            <ul className="mt-1.5 space-y-1">
                                                {usages.map((u, i) => (
                                                    <li
                                                        key={`${u.reservationId}-${i}`}
                                                        className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
                                                    >
                                                        <span className="truncate">
                                                            {t("profilePages.vouchers.usageLine", {
                                                                reservationId: u.reservationId || t("profilePages.vouchers.usageUnknownReservation"),
                                                                date: formatDate(u.at),
                                                            })}
                                                        </span>
                                                        <span className="font-semibold text-gray-800 dark:text-gray-100 shrink-0">
                                                            {symbol}{(u.amountApplied / 100).toLocaleString()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </ProfilePageShell>
    );
}
