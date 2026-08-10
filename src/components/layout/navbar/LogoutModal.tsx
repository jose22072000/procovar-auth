"use client";

import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { useLogoutModalContext } from "./LogoutModalProvider";
import { Icons } from "@/components/icons/iconify";
import { useTranslations } from "next-intl";

export function LogoutModal() {
    const t = useTranslations();
    const { isOpen, setIsOpen, isLoggingOut, handleLogout } = useLogoutModalContext();

    return (
        <Modal isOpen={isOpen} backdrop="blur" size="sm" onOpenChange={setIsOpen}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col items-center gap-3 pt-8 pb-2">
                            <div className="flex items-center justify-center w-16 h-16 rounded-sm bg-danger-50 border-2 border-danger-100">
                                <Icons.powerOff className="size-8 text-danger-500" />
                            </div>
                            <span className="text-xl font-bold text-foreground">{t("common.logoutModal.title")}</span>
                        </ModalHeader>
                        <ModalBody className="text-center px-6 pb-2">
                            <p className="text-default-600 text-sm">{t("common.logoutModal.body")}</p>
                        </ModalBody>
                        <ModalFooter className="flex gap-3 pb-6 px-6">
                            <Button
                                color="default"
                                variant="bordered"
                                onPress={onClose}
                                className="flex-1"
                                isDisabled={isLoggingOut}
                            >
                                {t("dashboard.common.cancel")}
                            </Button>
                            <Button
                                color="danger"
                                variant="bordered"
                                onPress={handleLogout}
                                isLoading={isLoggingOut}
                                isDisabled={isLoggingOut}
                                startContent={!isLoggingOut && <Icons.powerOff className="size-4" />}
                                className="flex-1"
                            >
                                {isLoggingOut ? t("common.logoutModal.loggingOut") : t("common.logoutModal.confirm")}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}