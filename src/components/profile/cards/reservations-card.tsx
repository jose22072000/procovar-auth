"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Chip, Button, Divider, Skeleton } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { useRouter } from "next/navigation";
import { loadReservationsIntoStore } from "@/app/(user)/profile/reservations/_load";
import { useTranslations } from "next-intl";

function toResStatus(s: string): "confirmed" | "pending" | "cancelled" {
    const lower = s.toLowerCase();
    if (lower === "confirmed" || lower === "checked_in" || lower === "checked_out") return "confirmed";
    if (lower === "cancelled" || lower === "no_show") return "cancelled";
    return "pending";
}

function getStatusColor(status: string) {
    switch (status) {
        case "confirmed": return "success";
        case "pending": return "warning";
        case "cancelled": return "danger";
        default: return "default";
    }
}

function getStatusLabel(status: string) {
    const map: Record<string, string> = { confirmed: "Confirmed", pending: "Pending", cancelled: "Cancelled" };
    return map[status] || status;
}

function ReservationSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 dark:bg-slate-800/40 rounded-sm p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <Skeleton className="h-5 w-32 rounded-sm" />
                            <Skeleton className="h-4 w-24 rounded-sm mt-1" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-sm" />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <div><Skeleton className="h-3 w-12 rounded-sm" /><Skeleton className="h-4 w-16 rounded-sm mt-1" /></div>
                        <div className="text-right"><Skeleton className="h-3 w-14 rounded-sm" /><Skeleton className="h-4 w-16 rounded-sm mt-1" /></div>
                    </div>
                    <Skeleton className="h-px my-3 w-full" />
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-10 rounded-sm" />
                        <Skeleton className="h-6 w-16 rounded-sm" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ReservationsCard() {
    const router = useRouter();
    const t = useTranslations();
    const reservations = useProfileDataStore((s) => s.reservations);
    const [isCardLoading, setIsCardLoading] = useState(true);

    useEffect(() => {
        loadReservationsIntoStore().finally(() => setIsCardLoading(false));
    }, []);

    const initialReservations = reservations.slice(0, 3);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-sm">
                        <Icons.reservation className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('cards.reservations')}</h3>
                        {isCardLoading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: initialReservations.length, total: reservations.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium" onPress={() => router.push("/profile/reservations")}>{t('cards.viewAll')}</Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                {isCardLoading ? (
                    <ReservationSkeleton />
                ) : initialReservations.length > 0 ? (
                    <div className="overflow-y-auto max-h-[520px] grid grid-cols-1 gap-4 pr-1">
                        {initialReservations.map((reservation) => (
                            <div key={reservation.id} onClick={() => router.push(`/profile/reservations/${reservation.id}`)} className="bg-gray-50 dark:bg-slate-800/40 rounded-sm p-4 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-black dark:text-white text-lg leading-tight">{reservation.propertyName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reservation.location}</p>
                                    </div>
                                    <Chip radius="sm" size="sm" color={getStatusColor(reservation.status)} variant="flat">{t.has(`cards.reservationStatus.${reservation.status}`) ? t(`cards.reservationStatus.${reservation.status}`) : reservation.status}</Chip>
                                </div>
                                <div className="flex justify-between items-center mt-3 text-sm">
                                    <div><p className="text-xs text-gray-400 dark:text-gray-500">{t('cards.checkIn')}</p><p className="font-medium text-black dark:text-white">{reservation.checkIn.split("T")[0]}</p></div>
                                    <div className="text-right"><p className="text-xs text-gray-400 dark:text-gray-500">{t('cards.checkOut')}</p><p className="font-medium text-black dark:text-white">{reservation.checkOut.split("T")[0]}</p></div>
                                </div>
                                <Divider className="my-3 bg-gray-200 dark:bg-slate-700" />
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('cards.total')}</p>
                                    <p className="font-bold text-blue-600 dark:text-blue-300 text-xl">{reservation.totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4 col-span-3">{t('cards.noReservations')}</p>
                )}
            </CardBody>
        </Card>
    );
}
