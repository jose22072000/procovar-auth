'use client'

/**
 * Página de usar y tirar para MIRAR el panel.
 *
 * Se borra en cuanto se comprueba. Existe porque la única forma de saber si un cajón sale
 * por el borde derecho o centrado como un modal es verlo, y montar una sesión de Accesos
 * para llegar a la pantalla de sucursales cuesta más que la comprobación.
 */

import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from '@heroui/react'
import { Panel } from '@/components/ui/panel'

export default function PruebaCajon() {
    const d = useDisclosure()

    return (
        <div className="p-10">
            <Button data-testid="abrir" onPress={d.onOpen}>Abrir</Button>
            <Panel isOpen={d.isOpen} onOpenChange={d.onOpenChange} size="2xl" scrollBehavior="inside">
                <ModalContent>
                    <ModalHeader>Nueva sucursal</ModalHeader>
                    <ModalBody>
                        <p>Un formulario largo, como los de Accesos.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={d.onClose}>Cancelar</Button>
                    </ModalFooter>
                </ModalContent>
            </Panel>
        </div>
    )
}
