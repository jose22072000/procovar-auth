"use client";

import { Chip } from "@heroui/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { resStatusMeta, resBizOf } from "./reservation-status";

export interface OrgReservation {
    id: string;
    organizationName: string;
    propertyName: string;
    guestName: string | null;
    guestEmail: string | null;
    checkIn: string;
    checkOut: string;
    status: string;
    totalPrice: number; // cents
    currency: string;
    code: string | null;
}

function fmt(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export function OrgReservationsCard({ reservations }: { reservations: OrgReservation[] }) {
    const t = useTranslations();
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-sm">
                    <Icons.reservation className="size-5 text-rose-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">{t('orgView.reservationsCardTitle')}</h3>
                    <p className="text-xs text-slate-400">
                        {t('orgView.reservationsToOrgsCount', { count: reservations.length })}
                    </p>
                </div>
                {reservations.length > 0 ? (
                    <Link href="/profile/org-reservations" className="text-xs font-medium text-[#0A2252] hover:underline">
                        {t('cards.viewAll')} →
                    </Link>
                ) : null}
            </div>

            {reservations.length === 0 ? (
                <p className="py-8 text-sm text-slate-400 text-center">{t('orgView.noOrgReservations')}</p>
            ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {reservations.map((r) => {
                        const st = resStatusMeta(r.status, r.checkOut);
                        const bizKey = resBizOf(r.status, r.checkOut);
                        const statusLabel = t.has(`orgView.status.${bizKey}`) ? t(`orgView.status.${bizKey}`) : bizKey;
                        return (
                            <Link
                                key={r.id}
                                href={`/profile/org-reservations/${r.id}`}
                                className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-slate-50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{r.organizationName}</p>
                                        {r.code ? <span className="text-xs text-slate-400 font-mono">#{r.code}</span> : null}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{r.propertyName}</p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {r.guestName ?? "—"}{r.guestEmail ? ` · ${r.guestEmail}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-xs text-slate-500 whitespace-nowrap">
                                        {fmt(r.checkIn)} → {fmt(r.checkOut)}
                                    </div>
                                    <Chip size="sm" variant="flat" color={st.color}>{statusLabel}</Chip>
                                    <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                                        {(r.totalPrice / 100).toFixed(2)} {r.currency}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
