"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Chip, Input } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { loadReservationsIntoStore } from "./_load";
import { currencySymbol, formatStayDate } from "@/lib/reservation-format";

type ResStatus = "confirmed" | "pending" | "cancelled";

const statusColor: Record<ResStatus, "success" | "warning" | "danger"> = {
    confirmed: "success",
    pending: "warning",
    cancelled: "danger",
};

function toResStatus(s: string): ResStatus {
    const lower = s.toLowerCase();
    if (lower === "confirmed" || lower === "checked_in" || lower === "checked_out") return "confirmed";
    if (lower === "cancelled" || lower === "no_show") return "cancelled";
    return "pending";
}

export function ReservationsClient({ bookingUrl }: { bookingUrl: string | null }) {
    const router = useRouter();
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const reservations = useProfileDataStore((s) => s.reservations);

    useEffect(() => {
        loadReservationsIntoStore().finally(() => setLoading(false));
    }, []);

    const filtered = reservations.filter(
        (res) =>
            res.propertyName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProfilePageShell
            title={t("profilePages.reservations.title")}
            icon={
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm">
                    <Icons.reservation className="size-5 text-indigo-600 dark:text-indigo-400" />
                </div>
            }
            count={filtered.length}
        >
            <div className="mb-4 flex gap-2 items-center">
                <div className="flex-1">
                    <Input
                        placeholder={t("profilePages.reservations.searchPlaceholder")}
                        value={search}
                        onValueChange={setSearch}
                        startContent={<Icons.search className="size-4 text-gray-400" />}
                        size="sm"
                        classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-800" }}
                    />
                </div>
                {bookingUrl && (
                    <Button
                        size="sm"
                        color="primary"
                        variant="bordered"
                        startContent={<Icons.plus className="size-4" />}
                        onPress={() => { window.location.href = bookingUrl; }}
                    >
                        {t("profilePages.reservations.newBooking")}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-400">{t("profilePages.reservations.loading")}</div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((res) => (
                        <div
                            key={res.id}
                            onClick={() => router.push(`/profile/reservations/${res.id}`)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm shrink-0">
                                    <Icons.bed className="size-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{res.propertyName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {formatStayDate(res.checkIn)} → {formatStayDate(res.checkOut)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {currencySymbol(res.currency)}{res.totalPrice.toLocaleString()}
                                </span>
                                <Chip
                                    radius="sm"
                                    size="sm"
                                    color={statusColor[res.status]}
                                    variant="flat"
                                    className="capitalize text-xs"
                                >
                                    {t(`orgView.status.${res.status.toUpperCase()}`)}
                                </Chip>
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-gray-400">{t("profilePages.reservations.empty")}</div>
                    )}
                </div>
            )}
        </ProfilePageShell>
    );
}
