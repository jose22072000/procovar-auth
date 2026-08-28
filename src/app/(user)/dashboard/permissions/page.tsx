import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RolesManager } from "@/components/admin/roles-manager.component";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

/**
 * Qué puede hacer cada rol.
 *
 * Debajo había un segundo bloque que listaba el catálogo de permisos entero, de
 * solo lectura. Enseñaba exactamente lo mismo que el gestor de arriba —los
 * mismos permisos, agrupados igual— pero sin poder tocar nada: media pantalla
 * repitiendo lo de la otra media. Se fue; su único botón útil, el de
 * sincronizar, subió a la cabecera.
 */
export default async function DashboardPermissionsPage() {
    const t = await getTranslations();

    const [session, permissionsRaw, rolesRaw] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        prisma.permission.findMany({
            where: { isDeprecated: false },
            orderBy: [{ service: "asc" }, { group: "asc" }, { key: "asc" }],
            select: { key: true, group: true, service: true, label: true },
        }),
        prisma.role.findMany({
            orderBy: [{ isSystem: "desc" }, { name: "asc" }],
            select: {
                id: true, name: true, description: true, isSystem: true,
                permissions: { select: { permission: { select: { key: true } } } },
                _count: { select: { memberRoles: true } },
            },
        }),
    ]);

    const permissions = permissionsRaw.map((p) => ({
        key: p.key,
        group: p.group,
        service: p.service,
        label: (p.label as { es?: string; en?: string } | null) ?? null,
    }));

    const roles = rolesRaw.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        // `permission` puede venir null: role_permission no tiene clave foránea y
        // una fila puede apuntar a un permiso ya borrado.
        permissionKeys: r.permissions
            .map((p) => p.permission?.key)
            .filter((k): k is string => Boolean(k)),
        memberCount: r._count.memberRoles,
    }));

    // El catálogo es de toda Procovar: quien lo cambia lo cambia para las ocho
    // sucursales. Esto solo apaga el botón — quien manda es el servidor, que lo
    // vuelve a comprobar en PATCH /api/rbac/roles/[roleId].
    const puedeEditar = Boolean(session?.user?.isSystemAdmin);

    return (
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:flex lg:h-screen lg:flex-col lg:space-y-0 lg:gap-5 lg:overflow-hidden">
      {/* La PÁGINA no se desplaza; se desplazan las columnas.
          Con la página desplazándose, la columna de la izquierda se iba hacia arriba con
          el contenido de la derecha —daba igual lo que se hiciera dentro de ella— y para
          cambiar de rol había que subir del todo. Aquí se le da el alto de la
          pantalla y se le quita el scroll: lo que corre es cada columna por dentro.
          Sólo en pantallas anchas: en un teléfono las columnas van una debajo de otra. */}
            <div className="lg:shrink-0">
                <p className="pv-rotulo">{t("rail.permisos")}</p>
                <h1 className="pv-titulo mt-1 text-2xl">{t("dashboard.permissionsPage.title")}</h1>
                <p className="mt-1 max-w-2xl text-sm text-pv-tinta-suave">
                    {t("dashboard.permissionsPage.subtitle", {
                        roles: roles.length,
                        permisos: permissions.length,
                    })}
                </p>
            </div>
            <div className="lg:min-h-0 lg:flex-1">
                <RolesManager roles={roles} permisos={permissions} puedeEditar={puedeEditar} />
            </div>
        </div>
    );
}
