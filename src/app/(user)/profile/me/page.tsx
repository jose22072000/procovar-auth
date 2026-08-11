import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { MiPerfilClient } from "@/components/profile/personal/mi-perfil-client";

export default async function MiPerfilPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    // El Super Admin también entra: esta es su ficha personal, no un panel.
    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
    });
    const isOrgUser = role === "org-full" || role === "org-restricted";

    return <MiPerfilClient isOrgUser={isOrgUser} />;
}
