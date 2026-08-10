import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager.component";
import { getTranslations } from "next-intl/server";

export default async function DashboardUsersPage() {
  const t = await getTranslations();
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, emailVerified: true, image: true, isSystemAdmin: true,
      phone: true, nationality: true, address: true, passportId: true, createdAt: true,
      _count: { select: { members: true, sessions: true } },
      subscriptions: {
        where: { status: "ACTIVE" }, orderBy: { currentPeriodEnd: "desc" }, take: 1,
        select: { status: true, billingCycle: true, currentPeriodEnd: true, plan: { select: { key: true, name: true } } },
      },
      members: {
        select: {
          organization: { select: { name: true, slug: true } },
          memberRoles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  });
  const users = rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, image: u.image,
    isSystemAdmin: u.isSystemAdmin, phone: u.phone, nationality: u.nationality, address: u.address,
    passportId: u.passportId, createdAt: u.createdAt.toISOString(),
    orgCount: u._count.members, sessionCount: u._count.sessions,
    subscription: u.subscriptions[0]
      ? { planKey: u.subscriptions[0].plan.key, planName: u.subscriptions[0].plan.name, status: u.subscriptions[0].status, currentPeriodEnd: u.subscriptions[0].currentPeriodEnd.toISOString() }
      : null,
    orgs: u.members.map((m) => ({ name: m.organization.name, slug: m.organization.slug, roles: m.memberRoles.map((r) => r.role.name) })),
  }));
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard.usersPage.title')}</h1>
      <UsersManager initialUsers={users} />
    </div>
  );
}
