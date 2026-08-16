import { prisma } from "@/lib/prisma";
import { OrgsManager } from "@/components/admin/orgs-manager.component";
import { getTranslations } from "next-intl/server";

export default async function DashboardOrgsPage() {
  const t = await getTranslations();
  // Los roles se leen UNA vez, no por sucursal: el catálogo es el mismo para
  // todas. Cada sucursal muestra la misma lista, y lo que cambia es quién tiene
  // cuál.
  // Las personas ya creadas, para poder AÑADIRLAS a una sucursal. Aquí no se
  // crean cuentas: eso es de la pantalla de Personas. Aquí solo se dice quién
  // trabaja dónde.
  const [personas, roles, orgs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, icon: true, isSystem: true },
    }),
    prisma.organization.findMany({
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
    id: o.id, name: o.name, slug: o.slug, logo: o.logo, memberCount: o.members.length,
    roles,
    members: o.members.map((m) => ({
      memberId: m.id, userId: m.userId, name: m.user.name, email: m.user.email,
      legacyRole: m.role, roleIds: m.memberRoles.map((r) => r.roleId),
    })),
  }));
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.organizationsPage.title')}</h1>
      <OrgsManager initialOrgs={data} personas={personas} />
    </div>
  );
}
