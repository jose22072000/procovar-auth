"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { BackendReservation } from "@/app/(user)/profile/_actions";

const STATUS_KEYS = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"] as const;

const STATUS_BADGE: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-sky-100 text-sky-700",
    CHECKED_IN: "bg-emerald-100 text-emerald-700",
    CHECKED_OUT: "bg-violet-100 text-violet-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-slate-100 text-slate-500",
};

interface RecentReservationsCardProps {
    reservations: BackendReservation[];
    allReservations?: BackendReservation[];
}

export function RecentReservationsCard({ reservations, allReservations }: RecentReservationsCardProps) {
    const t = useTranslations();
    const source = allReservations ?? reservations;
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    const statusLabel = (status: string) =>
        t.has(`orgView.rawStatus.${status}`) ? t(`orgView.rawStatus.${status}`) : status;

    const filtered = useMemo(() => {
        let list = [...source].sort(
            (a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
        );
        if (statusFilter !== "ALL") list = list.filter(r => r.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r => r.id.toLowerCase().includes(q));
        }
        return list.slice(0, 8);
    }, [source, statusFilter, search]);

    const fmt = (cents: number, currency = "EUR") =>
        (cents / 100).toLocaleString("es-ES", { style: "currency", currency });

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        {t('orgView.recentReservations')}
                    </h3>
                    <span className="text-xs text-slate-400">{t('orgView.resultsCount', { count: filtered.length })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        placeholder={t('orgView.searchByIdPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 flex-1 min-w-24"
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 bg-white"
                    >
                        <option value="ALL">{t('orgView.allStatuses')}</option>
                        {STATUS_KEYS.map((k) => (
                            <option key={k} value={k}>{statusLabel(k)}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">{t('orgView.noResults')}</div>
                ) : (
                    filtered.map(res => (
                        <div key={res.id} className="px-5 py-3 hover:bg-slate-50/60 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-mono text-xs text-slate-400">#{res.id.slice(0, 8)}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {res.checkIn.slice(0, 10)} → {res.checkOut.slice(0, 10)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[res.status] ?? "bg-slate-100 text-slate-500"}`}>
                                        {statusLabel(res.status)}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">
                                        {fmt(res.totalPrice, res.currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
