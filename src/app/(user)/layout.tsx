import { getCurrentUser } from "@/server/auth.server";
import { prisma } from "@/lib/prisma";
import { Armazon } from "@/components/layout/armazon";

export const dynamic = "force-dynamic";

/**
 * El armazón de lo que hay dentro de la sesión.
 *
 * **Sin sesión no hay armazón.** La barra lateral es navegación para quien ya
 * está dentro; en la pantalla de entrada no tiene adónde llevar y le comería el
 * borde, que va a sangre.
 *
 * El alcance —la sucursal— se calcula aquí, una vez, y baja al armazón para que
 * salga en todas las pantallas sin que cada una tenga que acordarse.
 */
export default async function UserLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { data: user } = await getCurrentUser();

    if (!user) return <>{children}</>;

    const miembros = await prisma.member.findMany({
        where: { userId: user.id },
        select: { organization: { select: { slug: true } } },
        orderBy: { createdAt: "asc" },
    });

    const esSuperAdmin = Boolean(user.isSystemAdmin);

    return (
        <Armazon
            persona={{
                nombre: user.name,
                correo: user.email,
                esSuperAdmin,
                // El Super Admin no pertenece a ninguna sucursal: las ve todas, y
                // decirlo así evita que parezca que le falta algo.
                alcance: esSuperAdmin ? "TODAS" : (miembros[0]?.organization.slug.toUpperCase() ?? null),
                llevaSucursal: miembros.length > 0,
            }}
        >
            {children}
        </Armazon>
    );
}
