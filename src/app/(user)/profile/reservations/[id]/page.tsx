"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, Textarea, addToast } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { requestReservationCancel } from "@/app/(user)/profile/_actions";
import { loadReservationsIntoStore } from "../_load";
import { currencySymbol, formatStayDate, nightsBetween } from "@/lib/reservation-format";

type Status = "confirmed" | "pending" | "cancelled";

const statusColor: Record<Status, "success" | "warning" | "danger"> = {
    confirmed: "success",
    pending: "warning",
    cancelled: "danger",
};


export default function ReservationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations();
    const reservations = useProfileDataStore((s) => s.reservations);
    const setReservationStatus = useProfileDataStore((s) => s.setReservationStatus);
    const deleteReservation = useProfileDataStore((s) => s.deleteReservation);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [reason, setReason] = useState("");
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 640px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    // Arriving straight from a notification link means nothing has filled the
    // store yet, and the page used to answer "reservation not found" for a
    // reservation that exists — which is why it appeared only after visiting the
    // list first. Load it here when the store cannot answer.
    const [isLoading, setIsLoading] = useState(reservations.length === 0);
    useEffect(() => {
        if (reservations.length > 0) return;
        let cancelled = false;
        loadReservationsIntoStore().finally(() => {
            if (!cancelled) setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // Runs once: refilling on every store change would loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const res = reservations.find((r) => r.id === params.id);

    if (!res && isLoading) {
        return (
            <ProfilePageShell
                title={t("profilePages.reservationDetail.notFoundTitle")}
                backPath="/profile/reservations"
                icon={
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm">
                        <Icons.reservation className="size-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                }
            >
                <div className="py-12 space-y-3">
                    <div className="h-4 w-1/3 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-2/3 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-700" />
                </div>
            </ProfilePageShell>
        );
    }

    if (!res) {
        return (
            <ProfilePageShell
                title={t("profilePages.reservationDetail.notFoundTitle")}
                backPath="/profile/reservations"
                icon={
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm">
                        <Icons.reservation className="size-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                }
            >
                <div className="py-12 text-center text-gray-400">{t("profilePages.reservationDetail.notFoundBody")}</div>
            </ProfilePageShell>
        );
    }

    const nights = nightsBetween(res.checkIn, res.checkOut);
    const sym = currencySymbol(res.currency);
    const pricePerNight = Math.round(res.totalPrice / nights);

    return (
        <ProfilePageShell
            title={res.propertyName}
            backPath="/profile/reservations"
            icon={
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-sm">
                    <Icons.reservation className="size-5 text-indigo-600 dark:text-indigo-400" />
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Chip radius="sm" size="sm" color={statusColor[res.status]} variant="flat" className="capitalize">
                                {t(`cards.reservationStatus.${res.status}`)}
                            </Chip>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Icons.building className="size-4 shrink-0" />
                            <span>{res.location}</span>
                        </div>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {sym}{res.totalPrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                            {sym}{pricePerNight.toLocaleString()} / {t("profilePages.reservationDetail.perNightUnit")}
                        </p>
                    </div>
                </div>

                {/* Dates */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.reservationDetail.stayLabel")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-sm bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">{t("cards.checkIn")}</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatStayDate(res.checkIn)}
                            </p>
                        </div>
                        <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                            <Icons.bed className="size-5 text-indigo-500 mb-1" />
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{nights}</p>
                            <p className="text-xs text-gray-400">{t("profilePages.reservationDetail.nightsUnit", { count: nights })}</p>
                        </div>
                        <div className="p-3 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">{t("cards.checkOut")}</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatStayDate(res.checkOut)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Price breakdown */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.reservationDetail.priceBreakdown")}
                    </h3>
                    <div className="rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                {sym}{pricePerNight.toLocaleString()} × {nights} {t("profilePages.reservationDetail.nightsUnit", { count: nights })}
                            </span>
                            <span className="text-gray-900 dark:text-white">
                                {sym}{res.totalPrice.toLocaleString()}
                            </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-semibold">
                            <span className="text-gray-900 dark:text-white">{t("profilePages.reservationDetail.total")}</span>
                            <span className="text-gray-900 dark:text-white">{sym}{res.totalPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Reservation ID (FNS code / UUID; internal id used only in logic) */}
                <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-400 mb-0.5">{t("profilePages.reservationDetail.reservationIdLabel")}</p>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">{res.code ?? res.id}</p>
                </div>

                {/* Extra detail rows */}
                <div className="rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-4 divide-y divide-gray-100 dark:divide-slate-700">
                    {res.roomTypeName && (
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500">{t("profilePages.reservationDetail.roomLabel")}</span>
                            <span className="text-gray-900 dark:text-white font-medium">{res.roomTypeName}</span>
                        </div>
                    )}
                    {typeof res.guests === "number" && (
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500">{t("profilePages.reservationDetail.guestsLabel")}</span>
                            <span className="text-gray-900 dark:text-white font-medium">{res.guests}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500">{t("profilePages.reservationDetail.rateLabel")}</span>
                        <span className={`font-medium ${res.refundable ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                            {res.refundable ? t("profilePages.reservationDetail.refundable") : t("profilePages.reservationDetail.nonRefundable")}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {res.status !== "cancelled" && (
                    <div className="flex gap-2 pt-2">
                        {/* A confirmed booking can only ask for a refund when the rate
                            is refundable; a non-refundable rate gets no refund button.
                            A pending hold can always be cancelled for free. */}
                        {(res.status !== "confirmed" || res.refundable) && (
                            <Button variant="bordered" size="sm" color="warning" startContent={<Icons.close className="size-4" />} onPress={() => setCancelOpen(true)} className="text-xs">
                                {res.status === "confirmed" ? t("profilePages.reservationDetail.requestRefund") : t("profilePages.reservationDetail.cancelReservation")}
                            </Button>
                        )}
                        <Button variant="bordered" size="sm" color="danger" startContent={<Icons.trashIcon className="size-4" />} onPress={() => setDeleteOpen(true)} className="text-xs">
                            {t("profilePages.reservationDetail.delete")}
                        </Button>
                    </div>
                )}
                {res.status === "cancelled" && (
                    <div className="flex gap-2 pt-2">
                        <Button variant="bordered" size="sm" color="danger" startContent={<Icons.trashIcon className="size-4" />} onPress={() => setDeleteOpen(true)} className="text-xs">
                            {t("profilePages.reservationDetail.delete")}
                        </Button>
                    </div>
                )}
            </div>

            {/* Cancel Modal / Drawer */}
            {(() => {
                const isConfirmed = res.status === "confirmed";
                const overlayTitle = isConfirmed ? t("profilePages.reservationDetail.refundModalTitle") : t("profilePages.reservationDetail.cancelModalTitle");
                const confirmLabel = isConfirmed ? t("profilePages.reservationDetail.submitRequest") : t("profilePages.reservationDetail.yesCancel");

                const handleConfirm = async (onClose: () => void) => {
                    setIsCancelling(true);
                    const r = await requestReservationCancel(res.id, isConfirmed ? reason.trim() : undefined);
                    setIsCancelling(false);
                    if (r.ok) {
                        if (r.status === "CANCELLED") {
                            setReservationStatus(res.id, "cancelled");
                            addToast({ title: t("profilePages.reservationDetail.toastCancelledTitle"), color: "success" });
                        } else if (r.status === "REFUND_REQUESTED") {
                            const ref = r.refund;
                            let desc = t("profilePages.reservationDetail.toastRequestSentDesc");
                            if (ref) {
                                if (ref.eligibility === "REQUIRES_REVIEW") desc = t("profilePages.reservationDetail.toastRefundReviewDesc");
                                else if (ref.refundableAmount != null && ref.refundableAmount > 0) desc = t("profilePages.reservationDetail.toastRefundEstimateDesc", { amount: `${currencySymbol(ref.currency)}${(ref.refundableAmount / 100).toLocaleString()}` });
                                else desc = t("profilePages.reservationDetail.toastNotRefundableDesc");
                            }
                            addToast({ title: t("profilePages.reservationDetail.toastRefundRequestedTitle"), description: desc, color: "primary" });
                            setReason("");
                        }
                        onClose();
                    } else {
                        addToast({ title: t("profilePages.reservationDetail.toastFailedTitle"), description: r.error ?? "", color: "danger" });
                    }
                };

                const cancelBody = (onClose: () => void) => (
                    <>
                        <ModalHeader>{overlayTitle}</ModalHeader>
                        <ModalBody>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isConfirmed
                                    ? t.rich("profilePages.reservationDetail.refundReasonPrompt", { property: res.propertyName, strong: (chunks) => <strong>{chunks}</strong> })
                                    : t.rich("profilePages.reservationDetail.cancelConfirmPrompt", { property: res.propertyName, strong: (chunks) => <strong>{chunks}</strong> })
                                }
                            </p>
                            {isConfirmed && (
                                <Textarea
                                    label={t("profilePages.reservationDetail.refundReasonLabel")}
                                    value={reason}
                                    onValueChange={setReason}
                                    className="mt-2"
                                />
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="bordered" startContent={<Icons.close className="size-4" />} onPress={onClose}>{t("profilePages.reservationDetail.keepIt")}</Button>
                            <Button
                                variant="bordered"
                                color="warning"
                                startContent={<Icons.checkCircle className="size-4" />}
                                isLoading={isCancelling}
                                isDisabled={isCancelling || (isConfirmed && reason.trim().length === 0)}
                                onPress={() => handleConfirm(onClose)}
                            >
                                {confirmLabel}
                            </Button>
                        </ModalFooter>
                    </>
                );

                const drawerBody = (onClose: () => void) => (
                    <>
                        <DrawerHeader>{overlayTitle}</DrawerHeader>
                        <DrawerBody>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {isConfirmed
                                    ? t.rich("profilePages.reservationDetail.refundReasonPrompt", { property: res.propertyName, strong: (chunks) => <strong>{chunks}</strong> })
                                    : t.rich("profilePages.reservationDetail.cancelConfirmPrompt", { property: res.propertyName, strong: (chunks) => <strong>{chunks}</strong> })
                                }
                            </p>
                            {isConfirmed && (
                                <Textarea
                                    label={t("profilePages.reservationDetail.refundReasonLabel")}
                                    value={reason}
                                    onValueChange={setReason}
                                    className="mt-2"
                                />
                            )}
                        </DrawerBody>
                        <DrawerFooter>
                            <Button variant="bordered" startContent={<Icons.close className="size-4" />} onPress={onClose}>{t("profilePages.reservationDetail.keepIt")}</Button>
                            <Button
                                variant="bordered"
                                color="warning"
                                startContent={<Icons.checkCircle className="size-4" />}
                                isLoading={isCancelling}
                                isDisabled={isCancelling || (isConfirmed && reason.trim().length === 0)}
                                onPress={() => handleConfirm(onClose)}
                            >
                                {confirmLabel}
                            </Button>
                        </DrawerFooter>
                    </>
                );

                return isMobile ? (
                    <Drawer isOpen={cancelOpen} placement="bottom" onOpenChange={(open) => { setCancelOpen(open); if (!open) setReason(""); }}>
                        <DrawerContent>{(onClose) => drawerBody(onClose)}</DrawerContent>
                    </Drawer>
                ) : (
                    <Modal isOpen={cancelOpen} backdrop="blur" size="sm" onOpenChange={(open) => { setCancelOpen(open); if (!open) setReason(""); }}>
                        <ModalContent>{(onClose) => cancelBody(onClose)}</ModalContent>
                    </Modal>
                );
            })()}

            {/* Delete Modal */}
            <Modal isOpen={deleteOpen} backdrop="blur" size="sm" onOpenChange={setDeleteOpen}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{t("profilePages.reservationDetail.deleteModalTitle")}</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t.rich("profilePages.reservationDetail.deleteModalBody", { property: res.propertyName, strong: (chunks) => <strong>{chunks}</strong> })}
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="bordered" startContent={<Icons.close className="size-4" />} onPress={onClose}>{t("profilePages.reservationDetail.modalCancelBtn")}</Button>
                                <Button variant="bordered" color="danger" startContent={<Icons.trashIcon className="size-4" />} onPress={() => { deleteReservation(res.id); onClose(); router.push("/profile/reservations"); }}>
                                    {t("profilePages.reservationDetail.delete")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </ProfilePageShell>
    );
}
