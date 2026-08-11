import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveRbac } from "@/rbac/resolve-permissions";
import { can } from "@/rbac/can";
import { OrgsManager } from "@/components/admin/orgs-manager.component";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

/**
 * Mi sucursal — la pantalla del Administrador.
 *
 * Es la MISMA pantalla que usa el Super Admin en el panel, alimentada solo con
 * las sucursales de esta persona. No es una copia recortada a propósito: una
 * segunda pantalla parecida acabaría divergiendo, y el día que se añada algo a
 * una, la otra se quedaría atrás sin que nadie lo notara.
 *
 * Lo que de verdad protege son las comprobaciones del servidor: cada acción
 * (`anadirPersona`, `removeOrgMember`, `setOrgMemberRoles`) vuelve a resolver el
 * permiso EN esa sucursal. Traer aquí solo las suyas es comodidad, no
 * seguridad — cambiar un identificador en la petición no sirve de nada.
 */
export default async function MiSucursalPage() {
    const t = await getTranslations();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/");

    // El Super Admin tiene el panel entero: mandarlo aquí sería enseñarle una
    // versión más pobre de lo que ya tiene.
    if (session.user.isSystemAdmin) redirect("/dashboard/organizations");

    const miembros = await prisma.member.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
    });

    // Solo las sucursales donde de verdad puede ver a la gente. Un Gestor es
    // miembro de una sucursal y no tiene nada que hacer en esta pantalla.
    const permitidas: string[] = [];
    for (const m of miembros) {
        const rbac = await resolveRbac(session.user.id, m.organizationId);
        if (can(rbac, "member.read")) permitidas.push(m.organizationId);
    }

    if (permitidas.length === 0) redirect("/profile");

    const [roles, orgs] = await Promise.all([
        prisma.role.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, color: true, icon: true, isSystem: true },
        }),
        prisma.organization.findMany({
            where: { id: { in: permitidas } },
            orderBy: { name: "asc" },
            select: {
                id: true, name: true, slug: true, logo: true,
                members: {
                    select: {
                        id: true, userId: true, role: true,
                        user: { select: { name: true, email: true } },
                        memberRoles: { select: { roleId: true } },
                    },
                },
            },
        }),
    ]);

    const data = orgs.map((o) => ({
        id: o.id, name: o.name, slug: o.slug, logo: o.logo,
        memberCount: o.members.length,
        roles,
        members: o.members.map((m) => ({
            memberId: m.id, userId: m.userId, name: m.user.name, email: m.user.email,
            legacyRole: m.role, roleIds: m.memberRoles.map((r) => r.roleId),
        })),
    }));

    return (
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
            <div>
                <p className="pv-rotulo">{t("navbar.section")}</p>
                <h1 className="pv-titulo text-2xl">{t("orgPage.title")}</h1>
                <p className="mt-1 text-sm text-pv-tinta-suave">{t("orgPage.subtitle")}</p>
            </div>
            <OrgsManager initialOrgs={data} />
        </div>
    );
}
