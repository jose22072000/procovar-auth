import { headers } from "next/headers";
import { PermissionsCatalog } from "@/components/profile/admin-view/permissions-catalog";
import { RolesManager } from "@/components/admin/roles-manager.component";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

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
    // sucursales. Esto solo oculta el botón — quien manda es el servidor, que
    // vuelve a comprobarlo en PATCH /api/rbac/roles/[roleId].
    const puedeEditar = Boolean(session?.user?.isSystemAdmin);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('dashboard.permissionsPage.title')}
            </h1>
            <RolesManager roles={roles} permisos={permissions} puedeEditar={puedeEditar} />
            <PermissionsCatalog permissions={permissions} />
        </div>
    );
}
