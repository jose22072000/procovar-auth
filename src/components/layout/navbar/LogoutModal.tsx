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

export function LogoutModal() {
    const { isOpen, setIsOpen, isLoggingOut, handleLogout } = useLogoutModalContext();

    return (
        <Modal isOpen={isOpen} scrollBehavior="outside" backdrop="blur" size="lg" onOpenChange={setIsOpen} classNames={{
            backdrop: "bg-transparent",
        }}>
            <ModalContent className="py-2">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex items-center gap-2 text-2xl font-bold text-danger-500">
                            <Icons.dialog className="size-8" /> Confirmar cierre de sesión
                        </ModalHeader>
                        <ModalBody>
                            <p className="text-center">¿Estás seguro de que quieres cerrar tu sesión? </p>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="default" variant="light" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                color="danger"
                                onPress={handleLogout}
                                isLoading={isLoggingOut}
                                disabled={isLoggingOut}
                                startContent={!isLoggingOut && <Icons.dialogCheck className="size-6" />}
                            >
                                {isLoggingOut ? "Cerrando sesión..." : "Confirmar"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}