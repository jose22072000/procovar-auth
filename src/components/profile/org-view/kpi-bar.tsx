"use client";

import { useTranslations } from "next-intl";
import { Sparkline } from "@/components/charts/sparkline";

interface OrgKpiBarProps {
    activePropertyCount: number;
    totalPropertyCount: number;
    totalReservationCount: number;
    uniqueClientCount: number;
    totalRevenueCents: number;
    monthlyRevenueCents: number;
    showFinancials: boolean;
    currency?: string;
}

function KpiCard({
    label, value, sub, subPositive, spark, color, borderColor,
}: {
    label: string;
    value: string;
    sub?: string;
    subPositive?: boolean;
    spark: number[];
    color: string;
    borderColor: string;
}) {
    return (
        <div
            className="relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
            style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
        >
            <div className="px-5 pt-4 pb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                {sub && (
                    <p className={`mt-1.5 text-xs font-medium ${subPositive !== false ? "text-emerald-600" : "text-slate-400"}`}>
                        {sub}
                    </p>
                )}
            </div>
            <div className="absolute bottom-2 right-3 opacity-70">
                <Sparkline data={spark} color={color} width={72} height={24} />
            </div>
        </div>
    );
}

function syntheticSpark(seed: number, points = 7): number[] {
    const out: number[] = [];
    let v = Math.max(1, seed * 0.5);
    for (let i = 0; i < points - 1; i++) {
        v = Math.max(0, v + Math.sin(i * 1.3 + seed) * v * 0.25);
        out.push(Math.round(v));
    }
    out.push(seed);
    return out;
}

export function OrgKpiBar({
    activePropertyCount,
    totalPropertyCount,
    totalReservationCount,
    uniqueClientCount,
    totalRevenueCents,
    monthlyRevenueCents,
    showFinancials,
    currency = "EUR",
}: OrgKpiBarProps) {
    const t = useTranslations();

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString("es-ES", { style: "currency", currency });

    const cols = showFinancials ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3";

    return (
        <div className={`grid ${cols} gap-4`}>
            <KpiCard
                label={t('orgView.activeProperties')}
                value={`${activePropertyCount} / ${totalPropertyCount}`}
                sub={t('orgView.statusLive')}
                subPositive={false}
                spark={syntheticSpark(activePropertyCount)}
                color="#0284C7"
                borderColor="#0284C7"
            />
            <KpiCard
                label={t('orgView.totalReservations')}
                value={totalReservationCount.toLocaleString("es-ES")}
                spark={syntheticSpark(totalReservationCount + 2)}
                color="#7C3AED"
                borderColor="#7C3AED"
            />
            <KpiCard
                label={t('orgView.uniqueClients')}
                value={uniqueClientCount.toLocaleString("es-ES")}
                spark={syntheticSpark(uniqueClientCount + 1)}
                color="#059669"
                borderColor="#059669"
            />
            {showFinancials && (
                <KpiCard
                    label={t('orgView.totalRevenue')}
                    value={fmt(totalRevenueCents)}
                    sub={`${fmt(monthlyRevenueCents)} ${t('orgView.thisMonth')}`}
                    spark={syntheticSpark(Math.round(totalRevenueCents / 100))}
                    color="#D97706"
                    borderColor="#D97706"
                />
            )}
        </div>
    );
}
