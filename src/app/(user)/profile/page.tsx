import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileContent } from "@/components/profile/profile-content";

export const dynamic = "force-dynamic";

/**
 * Mi cuenta.
 *
 * Antes esto traía las reservas y las facturas de la persona para calcular
 * "estancias activas", "completadas" y "gasto total" — del negocio de
 * alojamientos del que salió este código. Aquí no hay ni reservas ni facturas:
 * lo que define a alguien es en qué sucursales trabaja y con qué rol.
 *
 * Tampoco redirige ya al panel. Un Super Admin también tiene cuenta propia y
 * tiene que poder ver la suya sin que se lo lleven a otra pantalla.
 */
export default async function ProfilePage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    const miembros = await prisma.member.findMany({
        where: { userId: user.id },
        select: {
            organization: { select: { name: true, metadata: true } },
            memberRoles: { select: { role: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
    });

    const pertenencias = miembros.map((m) => {
        // El código de la sucursal (CAM, HOL…) va en `metadata` como JSON. Es lo
        // que la gente reconoce de un vistazo, mucho antes que el nombre largo.
        let codigo: string | null = null;
        try {
            codigo = JSON.parse(m.organization.metadata ?? "{}").codigo ?? null;
        } catch {
            codigo = null;
        }
        return {
            sucursal: m.organization.name,
            codigo,
            roles: m.memberRoles.map((r) => r.role.name),
        };
    });

    return <ProfileContent user={user} pertenencias={pertenencias} />;
}
