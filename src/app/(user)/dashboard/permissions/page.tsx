import { PermissionsCatalog } from "@/components/profile/admin-view/permissions-catalog";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function DashboardPermissionsPage() {
    const t = await getTranslations();
    const permissionsRaw = await prisma.permission.findMany({
        where: { isDeprecated: false },
        orderBy: [{ group: "asc" }, { key: "asc" }],
        select: { key: true, group: true, service: true, label: true },
    });
    const permissions = permissionsRaw.map((p) => ({
        key: p.key,
        group: p.group,
        service: p.service,
        label: (p.label as { es?: string; en?: string } | null) ?? null,
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.permissionsPage.title')}</h1>
            <PermissionsCatalog permissions={permissions} />
        </div>
    );
}
