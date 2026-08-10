"use client";

import { useTranslations } from "next-intl";
import { Sparkline } from "@/components/charts/sparkline";

interface ClientKpiBarProps {
    activeCount: number;
    completedCount: number;
    totalSpentCents: number;
    totalIncomeCents?: number;
    currency?: string;
}

function syntheticSpark(seed: number, points = 7): number[] {
    const out: number[] = [];
    let v = Math.max(1, seed * 0.5);
    for (let i = 0; i < points - 1; i++) {
        v = Math.max(0, v + Math.sin(i * 1.7 + seed) * v * 0.3);
        out.push(Math.round(v));
    }
    out.push(seed);
    return out;
}

function KpiCard({
    label,
    value,
    sub,
    spark,
    color,
    borderColor,
}: {
    label: string;
    value: string;
    sub?: string;
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
                {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
            </div>
            <div className="absolute bottom-2 right-3 opacity-70">
                <Sparkline data={spark} color={color} width={72} height={24} />
            </div>
        </div>
    );
}

export function ClientKpiBar({ activeCount, completedCount, totalSpentCents, totalIncomeCents, currency = "EUR" }: ClientKpiBarProps) {
    const t = useTranslations();

    const totalSpent = (totalSpentCents / 100).toLocaleString("es-ES", { style: "currency", currency });
    const totalIncome = totalIncomeCents != null
        ? (totalIncomeCents / 100).toLocaleString("es-ES", { style: "currency", currency })
        : null;

    const cols = totalIncome != null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";

    return (
        <div className={`grid ${cols} gap-4`}>
            <KpiCard
                label={t('clientView.activeStays')}
                value={String(activeCount)}
                sub={t('clientView.activeStaysSub')}
                spark={syntheticSpark(activeCount)}
                color="#0284C7"
                borderColor="#0284C7"
            />
            <KpiCard
                label={t('clientView.completedStays')}
                value={String(completedCount)}
                sub={t('clientView.completedStaysSub')}
                spark={syntheticSpark(completedCount + 1)}
                color="#059669"
                borderColor="#059669"
            />
            <KpiCard
                label={t('clientView.totalSpent')}
                value={totalSpent}
                sub={t('clientView.totalSpentSub')}
                spark={syntheticSpark(Math.round(totalSpentCents / 100))}
                color="#7C3AED"
                borderColor="#7C3AED"
            />
            {totalIncome != null && (
                <KpiCard
                    label={t('clientView.totalIncome')}
                    value={totalIncome}
                    sub={t('clientView.totalIncomeSub')}
                    spark={syntheticSpark(Math.round((totalIncomeCents ?? 0) / 100))}
                    color="#D97706"
                    borderColor="#D97706"
                />
            )}
        </div>
    );
}
