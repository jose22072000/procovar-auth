"use client";

import { useTranslations } from "next-intl";

interface UpcomingReservation {
    id: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    status: string;
}

const STATUS_BADGE: Record<string, string> = {
    CONFIRMED: "bg-sky-100 text-sky-700",
    CHECKED_IN: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: "Confirmado",
    CHECKED_IN: "En curso",
};

function nights(checkIn: string, checkOut: string): number {
    return Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
}

export function UpcomingStaysCard({ reservations }: { reservations: UpcomingReservation[] }) {
    const t = useTranslations();

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    {t('clientView.upcomingStays')}
                </p>
            </div>
            <div className="divide-y divide-slate-50">
                {reservations.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-400">
                        {t('clientView.noUpcomingStays')}
                    </div>
                ) : (
                    reservations.map(res => {
                        const n = nights(res.checkIn, res.checkOut);
                        return (
                            <div key={res.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-mono text-xs text-slate-400">#{res.id.slice(0, 8)}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <div>
                                                <p className="text-xs text-slate-400">Check-in</p>
                                                <p className="text-sm font-semibold text-slate-800">{res.checkIn.slice(0, 10)}</p>
                                            </div>
                                            <span className="text-slate-300">→</span>
                                            <div>
                                                <p className="text-xs text-slate-400">Check-out</p>
                                                <p className="text-sm font-semibold text-slate-800">{res.checkOut.slice(0, 10)}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{n} noche{n !== 1 ? "s" : ""}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_BADGE[res.status] ?? "bg-slate-100 text-slate-600"}`}>
                                        {STATUS_LABELS[res.status] ?? res.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
