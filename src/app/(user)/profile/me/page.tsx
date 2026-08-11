import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { MiPerfilClient } from "@/components/profile/personal/mi-perfil-client";

export const dynamic = "force-dynamic";

/** Mis datos, mi contraseña y mis avisos. */
export default async function MiPerfilPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    return <MiPerfilClient />;
}
