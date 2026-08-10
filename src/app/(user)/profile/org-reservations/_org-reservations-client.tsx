"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Chip, Input, Select, SelectItem, Pagination } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import type { OrgReservation } from "@/components/profile/org-view/org-reservations-card";
import { resStatusMeta, resBizOf } from "@/components/profile/org-view/reservation-status";

const ROWS_PER_PAGE = 8;

function fmt(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export function OrgReservationsClient({ reservations }: { reservations: OrgReservation[] }) {
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return reservations.filter((r) => {
            if (status !== "ALL" && resBizOf(r.status, r.checkOut) !== status) return false;
            if (q === "") return true;
            return (
                r.organizationName.toLowerCase().includes(q) ||
                r.propertyName.toLowerCase().includes(q) ||
                (r.guestName ?? "").toLowerCase().includes(q)
            );
        });
    }, [reservations, search, status]);

    const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    useEffect(() => { setPage(1); }, [search, status]);
    const pageItems = useMemo(() => filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE), [filtered, page]);

    return (
        <ProfilePageShell
            title={t('profilePages.orgReservations.title')}
            icon={
                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-sm">
                    <Icons.reservation className="size-5 text-rose-600 dark:text-rose-400" />
                </div>
            }
            count={filtered.length}
        >
            <div className="mb-4 flex flex-wrap gap-3">
                <Input
                    className="max-w-xs"
                    placeholder={t('profilePages.orgReservations.searchPlaceholder')}
                    value={search}
                    onValueChange={setSearch}
                    startContent={<Icons.search className="size-4 text-gray-400" />}
                    size="sm"
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-800" }}
                />
                <Select
                    className="max-w-[12rem]"
                    size="sm"
                    selectedKeys={[status]}
                    onSelectionChange={(keys) => setStatus(String(Array.from(keys)[0] ?? "ALL"))}
                    aria-label={t('profilePages.orgReservations.filterAriaLabel')}
                    classNames={{ trigger: "bg-gray-50 dark:bg-slate-800" }}
                >
                    <SelectItem key="ALL">{t('profilePages.orgReservations.allStatuses')}</SelectItem>
                    <SelectItem key="PENDING">{t('orgView.status.PENDING')}</SelectItem>
                    <SelectItem key="CONFIRMED">{t('orgView.status.CONFIRMED')}</SelectItem>
                    <SelectItem key="COMPLETED">{t('orgView.status.COMPLETED')}</SelectItem>
                    <SelectItem key="CANCELLED">{t('orgView.status.CANCELLED')}</SelectItem>
                </Select>
            </div>

            <div className="grid gap-3">
                {pageItems.map((r) => {
                    const st = resStatusMeta(r.status);
                    const bizKey = resBizOf(r.status, r.checkOut);
                    const statusLabel = t.has(`orgView.status.${bizKey}`) ? t(`orgView.status.${bizKey}`) : bizKey;
                    return (
                        <Link
                            key={r.id}
                            href={`/profile/org-reservations/${r.id}`}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-left hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{r.organizationName}</p>
                                    {r.code ? <span className="text-xs text-gray-400 font-mono">#{r.code}</span> : null}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{r.propertyName}</p>
                                <p className="text-xs text-gray-400 truncate">
                                    {r.guestName ?? "—"}{r.guestEmail ? ` · ${r.guestEmail}` : ""}
                                </p>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {(r.totalPrice / 100).toFixed(2)} {r.currency}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(r.checkIn)} → {fmt(r.checkOut)}</span>
                                    <Chip radius="sm" size="sm" color={st.color} variant="flat" className="text-xs">{statusLabel}</Chip>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-12 text-center text-gray-400">{t('profilePages.orgReservations.noResults')}</div>
                )}
            </div>

            {pages > 1 && (
                <div className="mt-4 flex justify-center">
                    <Pagination showControls page={page} total={pages} onChange={setPage} />
                </div>
            )}
        </ProfilePageShell>
    );
}
