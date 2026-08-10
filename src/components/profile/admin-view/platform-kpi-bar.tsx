"use client";

import { useTranslations } from "next-intl";
import { Sparkline } from "@/components/charts/sparkline";

interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    subPositive?: boolean;
    spark: number[];
    color: string;
    borderColor: string;
}

function KpiCard({ label, value, sub, subPositive, spark, color, borderColor }: KpiCardProps) {
    return (
        <div
            className="relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
            style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
        >
            <div className="px-5 pt-4 pb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
                {sub && (
                    <p className={`mt-1.5 text-xs font-medium ${subPositive !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {sub}
                    </p>
                )}
            </div>
            <div className="absolute bottom-2 right-3 opacity-70">
                <Sparkline data={spark} color={color} width={80} height={28} />
            </div>
        </div>
    );
}

function generateSpark(seed: number, points = 7): number[] {
    const out: number[] = [];
    let v = Math.max(1, seed * 0.5);
    for (let i = 0; i < points - 1; i++) {
        v = Math.max(0, v + (Math.sin(i * 1.3 + seed) * v * 0.25));
        out.push(Math.round(v));
    }
    out.push(seed);
    return out;
}

export interface PlatformKpiBarProps {
    activePropertyCount: number;
    weeklyReservationCount: number;
    newUserCount: number;
    activeOrgCount: number;
    totalUserCount?: number;
    totalReservationCount?: number;
}

export function PlatformKpiBar({
    activePropertyCount,
    weeklyReservationCount,
    newUserCount,
    activeOrgCount,
    totalUserCount,
    totalReservationCount,
}: PlatformKpiBarProps) {
    const t = useTranslations();

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                label={t('adminView.activeProperties')}
                value={activePropertyCount.toLocaleString('es-ES')}
                sub={totalReservationCount != null ? t('adminView.totalReservationsSub', { count: totalReservationCount.toLocaleString('es-ES') }) : undefined}
                spark={generateSpark(activePropertyCount, 7)}
                color="#7C3AED"
                borderColor="#7C3AED"
            />
            <KpiCard
                label={t('adminView.weeklyReservations')}
                value={weeklyReservationCount.toLocaleString('es-ES')}
                sub={t('adminView.weeklyReservationsSub')}
                subPositive={false}
                spark={generateSpark(weeklyReservationCount + 3, 7)}
                color="#0284C7"
                borderColor="#0284C7"
            />
            <KpiCard
                label={t('adminView.newUsers')}
                value={newUserCount.toLocaleString('es-ES')}
                sub={totalUserCount != null ? t('adminView.totalUsersSub', { count: totalUserCount.toLocaleString('es-ES') }) : undefined}
                spark={generateSpark(newUserCount + 2, 7)}
                color="#059669"
                borderColor="#059669"
            />
            <KpiCard
                label={t('adminView.activeOrgs')}
                value={activeOrgCount.toLocaleString('es-ES')}
                sub={t('adminView.activeOrgsSub')}
                subPositive={false}
                spark={generateSpark(activeOrgCount + 1, 7)}
                color="#D97706"
                borderColor="#D97706"
            />
        </div>
    );
}
