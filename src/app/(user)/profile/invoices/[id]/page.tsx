"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { type InvoiceStatus } from "@/lib/mock-data";
import { currencySymbol } from "@/lib/reservation-format";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { useInvoices } from "@/app/(user)/profile/_use-invoices";
import { cancelInvoice, deleteInvoice } from "@/app/(user)/profile/_actions";

const statusColor: Record<InvoiceStatus, "success" | "warning" | "danger" | "default" | "primary"> = {
    paid: "success",
    pending: "warning",
    overdue: "danger",
    cancelled: "default",
    refund_requested: "warning",
    refunded: "primary",
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations();
    // Se carga sola. Antes leía únicamente del store, que solo rellenaba el LISTADO: al
    // entrar DIRECTO desde una notificación (o un enlace, o un marcador) el store estaba
    // vacío y la página decía «no se encontró» sobre una factura que existe.
    const { invoices, loading, reload } = useInvoices();
    const payInvoice = useProfileDataStore((s) => s.payInvoice);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    /**
     * Cancelar y eliminar van CONTRA EL BACKEND. Antes llamaban a `deleteInvoice` del
     * store de Zustand, que solo filtraba la factura del estado local: desaparecía de la
     * pantalla y al recargar volvía. Quien decide si se puede es qb-back (una pagada
     * devuelve 409), así que aquí solo se muestra lo que conteste.
     */
    const runInvoiceAction = async (
        action: (id: string) => Promise<{ ok: boolean; error?: string }>,
        after: "stay" | "leave",
    ) => {
        if (!invoice) return;
        setBusy(true);
        setActionError(null);
        const res = await action(invoice.id);
        setBusy(false);
        setDeleteOpen(false);
        setCancelOpen(false);
        if (!res.ok) {
            setActionError(res.error ?? t("profilePages.invoiceDetail.actionFailed"));
            return;
        }
        // Al cancelar se recarga y se sigue aquí: la factura pasa a CANCELADA delante de
        // ti y aparece «Eliminar». Al eliminar ya no hay nada que mirar, así que se sale.
        if (after === "stay") {
            reload();
            return;
        }
        router.push("/profile/invoices");
        router.refresh();
    };

    const invoice = invoices.find((inv) => String(inv.id) === params.id);
    const sym = invoice ? currencySymbol(invoice.currency) : "$";

    if (!invoice) {
        // Mientras se carga NO se dice «no se encontró»: eso es lo que veía el usuario al
        // llegar desde una notificación, antes incluso de que llegara la respuesta.
        if (loading) {
            return (
                <ProfilePageShell
                    title={t("profilePages.invoiceDetail.notFoundTitle")}
                    backPath="/profile/invoices"
                    icon={<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-sm"><Icons.moneyBill className="size-5 text-purple-600 dark:text-purple-400" /></div>}
                >
                    <div className="py-12 text-center text-gray-400">…</div>
                </ProfilePageShell>
            );
        }
        return (
            <ProfilePageShell
                title={t("profilePages.invoiceDetail.notFoundTitle")}
                backPath="/profile/invoices"
                icon={
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-sm">
                        <Icons.moneyBill className="size-5 text-purple-600 dark:text-purple-400" />
                    </div>
                }
            >
                <div className="py-12 text-center text-gray-400">{t("profilePages.invoiceDetail.notFoundBody")}</div>
            </ProfilePageShell>
        );
    }

    return (
        <ProfilePageShell
            title={invoice.invoiceNumber}
            backPath="/profile/invoices"
            icon={
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-sm">
                    <Icons.moneyBill className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
            }
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                                {sym}{invoice.amount.toLocaleString()}
                            </span>
                            <Chip radius="sm"
                                size="sm"
                                color={statusColor[invoice.status]}
                                variant="flat"
                            >
                                {t(`profilePages.invoices.status.${invoice.status}`)}
                            </Chip>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.description}</p>
                    </div>
                    {/*
                      Botones: `bordered` (sin fondo) + icono + texto, según la pauta de la
                      casa.

                      Y las acciones siguen las reglas de negocio, no al revés:
                        PENDIENTE → Pagar o Cancelar.
                        CANCELADA → Eliminar (borrado lógico).
                        PAGADA    → ninguna de las dos. Una factura pagada no se cancela ni
                                    se borra: eso se deshace con un reembolso.
                      Antes se enseñaba «Eliminar» SIEMPRE, y encima era mentira: solo
                      quitaba la factura del estado local y al recargar volvía.
                    */}
                    <div className="flex gap-2 flex-wrap">
                        {(invoice.status === "pending" || invoice.status === "overdue") && (
                            <>
                                <Button
                                    variant="bordered"
                                    color="success"
                                    size="sm"
                                    startContent={<Icons.checkCircle className="size-4" />}
                                    onPress={() => payInvoice(invoice.id)}
                                >
                                    {t("profilePages.invoiceDetail.payNow")}
                                </Button>
                                <Button
                                    variant="bordered"
                                    color="warning"
                                    size="sm"
                                    isLoading={busy}
                                    startContent={<Icons.close className="size-4" />}
                                    onPress={() => setCancelOpen(true)}
                                >
                                    {t("profilePages.invoiceDetail.cancel")}
                                </Button>
                            </>
                        )}
                        <Button
                            variant="bordered"
                            color="secondary"
                            size="sm"
                            startContent={<Icons.moneyBill className="size-4" />}
                            onPress={() => {}}
                        >
                            {t("profilePages.invoiceDetail.downloadPdf")}
                        </Button>
                        {invoice.status === "cancelled" && (
                            <Button
                                variant="bordered"
                                color="danger"
                                size="sm"
                                isLoading={busy}
                                startContent={<Icons.trashIcon className="size-4" />}
                                onPress={() => setDeleteOpen(true)}
                            >
                                {t("profilePages.invoiceDetail.delete")}
                            </Button>
                        )}
                    </div>
                    {actionError && (
                        <p className="mt-2 text-sm text-danger">{actionError}</p>
                    )}
                </div>

                {/* Details grid */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.invoiceDetail.detailsHeading")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow label={t("profilePages.invoiceDetail.invoiceNumberLabel")} value={invoice.invoiceNumber} />
                        <DetailRow
                            label={t("profilePages.invoiceDetail.categoryLabel")}
                            value={t.has(`profilePages.invoiceDetail.categories.${invoice.category}`) ? t(`profilePages.invoiceDetail.categories.${invoice.category}`) : invoice.category}
                        />
                        <DetailRow label={t("profilePages.invoiceDetail.paymentMethodLabel")} value={invoice.paymentMethod} />
                        {invoice.period && <DetailRow label={t("profilePages.invoiceDetail.periodLabel")} value={invoice.period} />}
                    </div>
                </div>

                {/* Property */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.invoiceDetail.propertyHeading")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow label={t("profilePages.invoiceDetail.propertyNameLabel")} value={invoice.propertyName} />
                        <DetailRow label={t("profilePages.invoiceDetail.addressLabel")} value={invoice.propertyAddress} />
                    </div>
                </div>

                {/* Dates */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.invoiceDetail.datesHeading")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow
                            label={t("profilePages.invoiceDetail.invoiceDateLabel")}
                            value={new Date(invoice.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        />
                        {invoice.dueDate && (
                            <DetailRow
                                label={t("profilePages.invoiceDetail.dueDateLabel")}
                                value={new Date(invoice.dueDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Cancelar (solo si está PENDIENTE) */}
            <Modal isOpen={cancelOpen} backdrop="blur" size="sm" onOpenChange={setCancelOpen}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{t("profilePages.invoiceDetail.cancelModalTitle")}</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t.rich("profilePages.invoiceDetail.cancelModalBody", { number: invoice.invoiceNumber, strong: (chunks) => <strong>{chunks}</strong> })}
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="bordered" onPress={onClose}>{t("profilePages.invoiceDetail.modalCancelBtn")}</Button>
                                <Button
                                    variant="bordered"
                                    color="warning"
                                    isLoading={busy}
                                    startContent={<Icons.close className="size-4" />}
                                    onPress={() => void runInvoiceAction(cancelInvoice, "stay")}
                                >
                                    {t("profilePages.invoiceDetail.cancel")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Eliminar (solo si ya está CANCELADA) */}
            <Modal isOpen={deleteOpen} backdrop="blur" size="sm" onOpenChange={setDeleteOpen}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{t("profilePages.invoiceDetail.deleteModalTitle")}</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t.rich("profilePages.invoiceDetail.deleteModalBody", { number: invoice.invoiceNumber, strong: (chunks) => <strong>{chunks}</strong> })}
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="bordered" onPress={onClose}>{t("profilePages.invoiceDetail.modalCancelBtn")}</Button>
                                <Button
                                    variant="bordered"
                                    color="danger"
                                    isLoading={busy}
                                    startContent={<Icons.trashIcon className="size-4" />}
                                    onPress={() => void runInvoiceAction(deleteInvoice, "leave")}
                                >
                                    {t("profilePages.invoiceDetail.delete")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </ProfilePageShell>
    );
}
