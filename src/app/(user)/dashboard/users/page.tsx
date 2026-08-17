import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager.component";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

/**
 * Todas las personas de Procovar, de todas las sucursales.
 *
 * Ya no se traen las suscripciones: eran planes de pago del producto del que
 * salió este código. Aquí nadie paga una suscripción — lo que define a una
 * persona es en qué sucursales trabaja y con qué rol.
 */
export default async function DashboardUsersPage() {
  const t = await getTranslations();

  // Los roles se traen para poder DAR DE ALTA desde aquí, y para poder cambiárselo
  // a alguien desde su ficha.
  //
  // El alta ya existía, pero solo dentro de una sucursal, y nadie la busca ahí:
  // esta aplicación no tiene registro público —las cuentas las abre un
  // administrador— así que "crear una persona" es lo primero que se viene a hacer
  // a esta pantalla. La sucursal no se pide: eso se dice en Sucursales.
  const [roles, rows] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, username: true, emailVerified: true,
      image: true, isSystemAdmin: true, phone: true, createdAt: true,
      defaultRoleId: true,
      _count: { select: { members: true, sessions: true } },
      members: {
        select: {
          organization: { select: { name: true, slug: true } },
          memberRoles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  })]);

  const users = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    emailVerified: u.emailVerified,
    image: u.image,
    isSystemAdmin: u.isSystemAdmin,
    phone: u.phone,
    defaultRoleId: u.defaultRoleId,
    createdAt: u.createdAt.toISOString(),
    orgCount: u._count.members,
    sessionCount: u._count.sessions,
    orgs: u.members.map((m) => ({
      name: m.organization.name,
      slug: m.organization.slug,
      roles: m.memberRoles.map((r) => r.role.name),
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <p className="pv-rotulo">{t("rail.personas")}</p>
        <h1 className="pv-titulo mt-1 text-2xl">{t("dashboard.usersPage.title")}</h1>
        <p className="mt-1 text-sm text-pv-tinta-suave">
          {t("dashboard.usersPage.subtitle", { n: users.length })}
        </p>
      </div>
      <UsersManager initialUsers={users} roles={roles} />
    </div>
  );
}
