"use client";

import { useTranslations } from "next-intl";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { ProfileEditor } from "./profile-editor";
import { SecuritySection } from "./security-section";
import { NotificationsSection } from "./notifications-section";

export interface MiPerfilClientProps {
    isOrgUser: boolean;
}

/**
 * Mi perfil: los datos de la persona, su contraseña y sus avisos.
 *
 * Antes esto arrancaba con un asistente paso a paso que preguntaba los datos de
 * uno en uno. Un asistente sirve para quien entra por primera vez a un producto
 * y no sabe qué se espera de él; aquí entra gente de la casa a cambiar su
 * teléfono. El formulario, entero y de una vez, es más rápido para eso.
 */
export function MiPerfilClient({ isOrgUser }: MiPerfilClientProps) {
    const t = useTranslations();

    return (
        <ProfilePageShell
            title={t("myProfile.title")}
            backPath={isOrgUser ? "/profile/org" : "/profile"}
            icon={
                <div className="rounded-sm bg-pv-azul-tinte p-2">
                    <Icons.userCircle className="size-5 text-pv-azul" />
                </div>
            }
        >
            <div className="space-y-5">
                <ProfileEditor />
                <SecuritySection />
                <NotificationsSection />
            </div>
        </ProfilePageShell>
    );
}
