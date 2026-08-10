"use client";

import { Sparkline } from "@/components/charts/sparkline";
import { Button, Tooltip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface OwnerKpiBarProps {
    availableCents: number;
    pendingCents: number;
    currency?: string;
    availableSeries?: number[];
    pendingSeries?: number[];
}

// Ensure the sparkline always has at least two points to draw a line.
function spark(series: number[] | undefined, current: number): number[] {
    const s = (series ?? []).filter((n) => Number.isFinite(n));
    if (s.length >= 2) return s;
    if (s.length === 1) return [0, s[0]];
    return [0, current];
}

function KpiCard({
    label,
    value,
    sub,
    spark,
    color,
    borderColor,
    action,
}: {
    label: string;
    value: string;
    sub?: string;
    spark: number[];
    color: string;
    borderColor: string;
    action?: React.ReactNode;
}) {
    return (
        <div
            className="relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
            style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
        >
            <div className="px-5 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
            </div>
            <div className="absolute bottom-2 right-3 opacity-70">
                <Sparkline data={spark} color={color} width={72} height={24} />
            </div>
        </div>
    );
}

export function OwnerKpiBar({ availableCents, pendingCents, currency = "EUR", availableSeries, pendingSeries }: OwnerKpiBarProps) {
    const t = useTranslations();
    const available = (availableCents / 100).toFixed(2);
    const pending = (pendingCents / 100).toFixed(2);

    return (
        <div className="grid grid-cols-2 gap-4">
            <KpiCard
                label={t('orgView.availableBalance')}
                value={`${available} ${currency}`}
                sub={t('orgView.paidSub')}
                spark={spark(availableSeries, availableCents / 100)}
                color="#10B981"
                borderColor="#10B981"
                action={
                    <Tooltip content={t('orgView.viewEarningsRecordTooltip')} size="sm">
                        <Button as={Link} href="/profile/payouts" size="sm" color="primary" variant="bordered"
                            startContent={<Icons.wallet className="size-4" />}>
                            {t('orgView.viewRecord')}
                        </Button>
                    </Tooltip>
                }
            />
            <KpiCard
                label={t('orgView.toBePaid')}
                value={`${pending} ${currency}`}
                sub={t('orgView.pendingSub')}
                spark={spark(pendingSeries, pendingCents / 100)}
                color="#D97706"
                borderColor="#D97706"
            />
        </div>
    );
}
