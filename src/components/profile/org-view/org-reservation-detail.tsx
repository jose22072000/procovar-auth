"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import type { OrgReservation } from "./org-reservations-card";
import { resStatusMeta, resBizOf } from "./reservation-status";

function fmt(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-2">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-gray-900 dark:text-white font-medium text-right break-words">{children}</span>
        </div>
    );
}

/** Full-page owner reservation detail (replaces the old right-side drawer). */
export function OrgReservationDetail({ reservation }: { reservation: OrgReservation | null }) {
    const t = useTranslations();
    const icon = (
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-sm">
            <Icons.reservation className="size-5 text-rose-600 dark:text-rose-400" />
        </div>
    );

    if (!reservation) {
        return (
            <ProfilePageShell title={t('orgView.reservationNotFoundTitle')} backPath="/profile/org-reservations" icon={icon}>
                <div className="py-12 text-center text-gray-400">{t('orgView.reservationNotFoundBody')}</div>
            </ProfilePageShell>
        );
    }

    const st = resStatusMeta(reservation.status, reservation.checkOut);
    const bizKey = resBizOf(reservation.status, reservation.checkOut);
    const statusLabel = t.has(`orgView.status.${bizKey}`) ? t(`orgView.status.${bizKey}`) : bizKey;

    return (
        <ProfilePageShell title={t('orgView.reservationDetailTitle')} backPath="/profile/org-reservations" icon={icon}>
            <div className="space-y-6">
                {/* Header: status + total */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <Chip radius="sm" size="sm" color={st.color} variant="flat">{statusLabel}</Chip>
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Icons.building className="size-4 shrink-0" />
                            <span>{reservation.propertyName}</span>
                        </div>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {(reservation.totalPrice / 100).toFixed(2)} {reservation.currency}
                        </p>
                    </div>
                </div>

                {/* Stay dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-sm bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">{t('cards.checkIn')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(reservation.checkIn)}</p>
                    </div>
                    <div className="p-3 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">{t('cards.checkOut')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(reservation.checkOut)}</p>
                    </div>
                </div>

                {/* Detail rows */}
                <div className="rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-4 divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                    <Row label={t('orgView.organizationLabel')}>{reservation.organizationName}</Row>
                    <Row label={t('orgView.propertyLabel')}>{reservation.propertyName}</Row>
                    <Row label={t('orgView.guestLabel')}>{reservation.guestName ?? "—"}</Row>
                    <Row label={t('orgView.emailLabel')}>{reservation.guestEmail ?? "—"}</Row>
                </div>

                {/* Reservation code */}
                <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-400 mb-0.5">{t('orgView.reservationLabel')}</p>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{reservation.code ?? "—"}</p>
                </div>
            </div>
        </ProfilePageShell>
    );
}
