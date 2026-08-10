import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { prisma } from "@/lib/prisma";
import { OrgProfileView } from "@/components/profile/org-view";
import { OrgEventsRefresher } from "@/components/profile/org-view/org-events-refresher";
import type { Member } from "@/components/full-user-provider";

export default async function OrgProfilePage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    let members: Member[] = ((user as any).members as Member[] | undefined) ?? [];
    if (members.length === 0) {
        const dbMembers = await prisma.member.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                role: true,
                organizationId: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                        metadata: true,
                        createdAt: true,
                    },
                },
            },
        });
        members = dbMembers.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
            organization: {
                ...m.organization,
                createdAt: m.organization.createdAt.toISOString(),
            },
        }));
    }

    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
        members: members.map((m) => ({ role: m.role, organizationId: m.organizationId })),
    });

    // Admins may preview the owner view (they reach it from the account switcher).
    // A client with no org is bounced to their personal profile.
    if (role === "client") redirect("/profile");

    // Sin propietarios, sin saldos y sin reservas: eso era el negocio de
    // alojamientos de QuickBook. En Procovar una organizacion son SUCURSALES y
    // PERSONAS, y lo que importa de cada persona es su rol en cada aplicacion.
    const orgs = members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
    }));

    return (
        <>
            {/* Real-time: refresh this view when any reservation/payout changes in an owned org. */}
            {orgs.map((o) => (
                <OrgEventsRefresher key={o.id} orgId={o.id} />
            ))}
            <OrgProfileView
                user={{ id: user.id, name: user.name, email: user.email, image: user.image ?? null, emailVerified: user.emailVerified }}
            />
        </>
    );
}
