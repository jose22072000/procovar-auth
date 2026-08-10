"use client";

import { Chip } from "@heroui/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import type { PayoutWithOrg } from "./payout-detail-drawer";

function fmt(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

const STATUS_COLOR: Record<string, "success" | "warning" | "danger" | "default"> = {
    PAID: "success",
    PENDING: "warning",
    FAILED: "danger",
    CANCELLED: "default",
};

function Row({ payout }: { payout: PayoutWithOrg }) {
    const t = useTranslations();
    const color = STATUS_COLOR[payout.status] ?? "default";
    const label = t.has(`orgView.payoutStatus.${payout.status}`) ? t(`orgView.payoutStatus.${payout.status}`) : payout.status;
    const st = { label, color };
    return (
        <Link
            href={`/profile/payouts/${payout.id}`}
            className="flex w-full items-center gap-3 py-3 border-b border-slate-100 last:border-0 text-left hover:bg-slate-50 transition-colors"
        >
            <div className="p-2 bg-emerald-100 rounded-sm shrink-0">
                <Icons.wallet className="size-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                    {payout.organizationName}
                    {payout.invoiceNumber ? <span className="ml-1 text-xs text-slate-400 font-mono">{payout.invoiceNumber}</span> : null}
                </p>
                <p className="text-xs text-slate-500 truncate">{payout.description ?? `${payout.lineCount} ${t('orgView.reservationsLabel')}`}</p>
            </div>
            <div className="text-xs text-slate-400 shrink-0 hidden sm:block">{fmt(payout.issuedAt)}</div>
            <Chip size="sm" className="shrink-0" color={st.color} variant="flat">{st.label}</Chip>
            <div className="text-sm font-semibold text-slate-900 shrink-0 ml-2">
                {(payout.amount / 100).toFixed(2)} {payout.currency}
            </div>
        </Link>
    );
}

export function OwnerPayoutsCard({ payouts }: { payouts: PayoutWithOrg[] }) {
    const t = useTranslations();
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">{t('orgView.payoutsCardTitle')}</h3>
                {payouts.length > 0 ? (
                    <Link href="/profile/payouts" className="text-xs font-medium text-[#0A2252] hover:underline">
                        {t('cards.viewAll')} →
                    </Link>
                ) : null}
            </div>
            {payouts.length === 0 ? (
                <p className="py-6 text-sm text-slate-400 text-center">{t('orgView.noPayoutsRegistered')}</p>
            ) : (
                <div className="px-5 max-h-80 overflow-y-auto">
                    {payouts.map((p) => (
                        <Row key={p.id} payout={p} />
                    ))}
                </div>
            )}
        </div>
    );
}
