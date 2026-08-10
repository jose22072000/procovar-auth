"use client";

import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { currencySymbol } from "@/lib/reservation-format";
import type { OwnerBalancePayout } from "../../_actions";

const STATUS_COLOR: Record<string, "success" | "warning" | "danger" | "default"> = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "danger",
    CANCELLED: "default",
};

function fmt(dateStr: string | null): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    } catch {
        return dateStr;
    }
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{value}</p>
        </div>
    );
}

const walletIcon = (
    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm">
        <Icons.wallet className="size-5 text-emerald-600 dark:text-emerald-400" />
    </div>
);

export function PayoutDetailView({ payout, organizationName }: { payout: OwnerBalancePayout | null; organizationName: string }) {
    const t = useTranslations();

    if (!payout) {
        return (
            <ProfilePageShell title={t("profilePages.payoutDetail.notFoundTitle")} backPath="/profile/payouts" icon={walletIcon}>
                <div className="py-12 text-center text-gray-400">{t("profilePages.payoutDetail.notFoundBody")}</div>
            </ProfilePageShell>
        );
    }

    const statusColor = STATUS_COLOR[payout.status] ?? "default";
    const statusLabel = t.has(`profilePages.payouts.status.${payout.status}`)
        ? t(`profilePages.payouts.status.${payout.status}`)
        : payout.status;
    const sym = currencySymbol(payout.currency);

    return (
        <ProfilePageShell title={payout.invoiceNumber ?? t("profilePages.payoutDetail.defaultTitle")} backPath="/profile/payouts" icon={walletIcon}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                {sym}{(payout.amount / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <Chip radius="sm" size="sm" color={statusColor} variant="flat">{statusLabel}</Chip>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{payout.description ?? t("profilePages.payoutDetail.defaultDescription", { count: payout.lineCount })}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="bordered" color="secondary" size="sm" startContent={<Icons.moneyBill className="size-4" />} onPress={() => {}}>
                            {t("profilePages.payoutDetail.downloadPdf")}
                        </Button>
                    </div>
                </div>

                {/* Payout details */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("profilePages.payoutDetail.detailsHeading")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow label={t("profilePages.payoutDetail.invoiceNumberLabel")} value={payout.invoiceNumber ?? "—"} />
                        <DetailRow label={t("profilePages.payoutDetail.organizationLabel")} value={organizationName} />
                        <DetailRow label={t("profilePages.payoutDetail.conceptLabel")} value={payout.description ?? "—"} />
                        <DetailRow label={t("profilePages.payoutDetail.reservationsCountLabel")} value={String(payout.lineCount)} />
                    </div>
                </div>

                {/* Dates */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("profilePages.payoutDetail.datesHeading")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow label={t("profilePages.payoutDetail.issueDateLabel")} value={fmt(payout.issuedAt)} />
                        <DetailRow label={t("profilePages.payoutDetail.paymentDateLabel")} value={fmt(payout.dueDate)} />
                        <DetailRow label={t("profilePages.payoutDetail.paidDateLabel")} value={fmt(payout.paidAt)} />
                    </div>
                </div>

                {/* Accumulated reservations (the payout-specific part) */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.payoutDetail.reservationsIncludedHeading", { count: payout.lineCount })}
                    </h3>
                    {payout.lines.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 text-sm">{t("profilePages.payoutDetail.noReservations")}</div>
                    ) : (
                        <div className="grid gap-3">
                            {payout.lines.map((l) => (
                                <div
                                    key={l.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {l.guestName ?? "—"}
                                            {l.reservationCode ? <span className="ml-1 text-xs text-gray-400 font-mono">#{l.reservationCode}</span> : null}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{l.propertyName ?? "—"}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                                        {sym}{(l.amount / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProfilePageShell>
    );
}
