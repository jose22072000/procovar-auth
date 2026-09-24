import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rbacEnSucursal, rolesEnSucursal } from "@/rbac/en-sucursal";
import { can } from "@/rbac/can";
import { rolesRepartibles } from "@/rbac/escalafon";
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
    //
    // Y de paso se apunta si además puede DAR DE ALTA en ella: no es lo mismo
    // mirar que repartir, y el botón de crear sólo debe salir donde puede.
    const permitidas: string[] = [];
    const puedeAltaEn = new Set<string>();
    for (const m of miembros) {
        const rbac = await rbacEnSucursal(session.user.id, m.organizationId);
        if (can(rbac, "member.read")) permitidas.push(m.organizationId);
        if (can(rbac, "member.invite")) puedeAltaEn.add(m.organizationId);
    }

    if (permitidas.length === 0) redirect("/profile");

    const [roles, orgs] = await Promise.all([
        prisma.role.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true, name: true, color: true, icon: true, isSystem: true,
                // Hacen falta dos cosas de las claves: si el rol VENDE —y entonces
                // se le pide el código— y si esta persona puede repartirlo.
                permissions: { select: { permission: { select: { key: true } } } },
            },
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

    // El catálogo, sin las claves de permiso: la pantalla no las necesita y
    // mandarlas al navegador sería enseñar el mapa entero de lo que hace cada rol.
    const catalogo = roles.map(({ permissions, ...r }) => ({
        ...r,
        vende: permissions.some((p) => p.permission?.key === "vendedor.codigo"),
    }));

    /**
     * Los roles que ESTA persona puede repartir en ESTA sucursal.
     *
     * Sólo los de debajo del suyo: un Administrador reparte Gerente, Supervisor,
     * Gestor y Operador, y ni Super Admin ni Desarrollador ni otro Administrador.
     * Lo decide `escalafon.ts`, el mismo que vuelve a comprobarlo en el servidor
     * cuando llega la petición — aquí sólo se evita ofrecer lo que va a fallar.
     */
    const repartiblesPorOrg = new Map<string, string[]>();
    for (const o of orgs) {
        const rbac = await rbacEnSucursal(session.user.id, o.id);
        const mios = await rolesEnSucursal(session.user.id, o.id);
        const puede = rolesRepartibles(
            rbac,
            mios,
            roles.map((r) => ({
                id: r.id,
                name: r.name,
                claves: r.permissions.map((p) => p.permission?.key).filter((k): k is string => Boolean(k)),
            })),
        );
        repartiblesPorOrg.set(o.id, puede.map((r) => r.id));
    }

    const data = orgs.map((o) => ({
        id: o.id, name: o.name, slug: o.slug, logo: o.logo,
        memberCount: o.members.length,
        roles: catalogo,
        rolesRepartibles: repartiblesPorOrg.get(o.id) ?? [],
        puedeCrearCuenta: puedeAltaEn.has(o.id),
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
