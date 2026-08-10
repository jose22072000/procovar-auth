"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";

const serviceFrequencyKeys: Record<string, "monthly" | "biweekly" | "weekly"> = {
    "SVC-001": "monthly",
    "SVC-002": "biweekly",
    "SVC-003": "monthly",
    "SVC-004": "weekly",
    "SVC-005": "monthly",
    "SVC-006": "monthly",
    "SVC-007": "weekly",
    "SVC-008": "monthly",
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

export default function ServiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations();
    const services = useProfileDataStore((s) => s.services);
    const toggleServiceStatus = useProfileDataStore((s) => s.toggleServiceStatus);
    const deleteService = useProfileDataStore((s) => s.deleteService);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const service = services.find((s) => s.id === params.id);

    if (!service) {
        return (
            <ProfilePageShell
                title={t("profilePages.serviceDetail.notFoundTitle")}
                backPath="/profile/services"
                icon={
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-sm">
                        <Icons.service className="size-5 text-green-600 dark:text-green-400" />
                    </div>
                }
            >
                <div className="py-12 text-center text-gray-400">{t("profilePages.serviceDetail.notFoundBody")}</div>
            </ProfilePageShell>
        );
    }

    return (
        <ProfilePageShell
            title={service.name}
            backPath="/profile/services"
            icon={
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-sm">
                    <Icons.service className="size-5 text-green-600 dark:text-green-400" />
                </div>
            }
        >
            <div className="space-y-6">
                {/* Status header */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <Chip radius="sm"
                        size="sm"
                        color={service.status === "active" ? "success" : "default"}
                        variant="flat"
                        className="capitalize"
                    >
                        {t(`profilePages.services.status.${service.status}`)}
                    </Chip>
                    {service.status === "expired" && (
                        <span className="text-xs text-gray-400">{t("profilePages.serviceDetail.notActiveNote")}</span>
                    )}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t.has(`profilePages.serviceDetail.descriptions.${service.id}`)
                        ? t(`profilePages.serviceDetail.descriptions.${service.id}`)
                        : t("profilePages.serviceDetail.noDescription")}
                </p>

                {/* Details */}
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {t("profilePages.serviceDetail.detailsHeading")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow label={t("profilePages.serviceDetail.nameLabel")} value={service.name} />
                        <DetailRow label={t("profilePages.serviceDetail.propertyLabel")} value={service.propertyName} />
                        <DetailRow
                            label={t("profilePages.serviceDetail.billingFrequencyLabel")}
                            value={t(`profilePages.serviceDetail.frequency.${serviceFrequencyKeys[service.id] ?? "monthly"}`)}
                        />
                        <DetailRow
                            label={t("cards.nextPayment")}
                            value={service.status === "active" ? service.nextPayment : "—"}
                        />
                        <DetailRow label={t("profilePages.serviceDetail.idLabel")} value={service.id} />
                        <DetailRow label={t("profilePages.serviceDetail.statusLabel")} value={t(`profilePages.services.status.${service.status}`)} />
                    </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="bordered"
                        size="sm"
                        color={service.status === "active" ? "danger" : "success"}
                        startContent={<Icons.powerOff className="size-4" />}
                        onPress={() => toggleServiceStatus(service.id)}
                        className="text-xs"
                    >
                        {service.status === "active" ? t("profilePages.serviceDetail.deactivate") : t("profilePages.serviceDetail.activate")}
                    </Button>
                    <Button variant="bordered" size="sm" color="danger" startContent={<Icons.trashIcon className="size-4" />} onPress={() => setDeleteOpen(true)} className="text-xs">
                        {t("profilePages.serviceDetail.delete")}
                    </Button>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal isOpen={deleteOpen} backdrop="blur" size="sm" onOpenChange={setDeleteOpen}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{t("profilePages.serviceDetail.deleteModalTitle")}</ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t.rich("profilePages.serviceDetail.deleteModalBody", { name: service.name, strong: (chunks) => <strong>{chunks}</strong> })}
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="bordered" startContent={<Icons.close className="size-4" />} onPress={onClose}>{t("profilePages.serviceDetail.modalCancelBtn")}</Button>
                                <Button variant="bordered" color="danger" startContent={<Icons.trashIcon className="size-4" />} onPress={() => { deleteService(service.id); onClose(); router.push("/profile/services"); }}>
                                    {t("profilePages.serviceDetail.delete")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </ProfilePageShell>
    );
}
