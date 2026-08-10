import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { prisma } from "@/lib/prisma";
import { fetchOwnerBalance, fetchOrgProperties, fetchOrgReservations } from "../_actions";
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

    const balResult = await fetchOwnerBalance();
    const balance = balResult.data ?? { availableCents: 0, pendingCents: 0, payouts: [] };

    const orgs = members.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
    }));

    // Reservations made TO the owner's organizations: orgs → properties → reservations,
    // each tagged with the organization it came from.
    const propertyOrgName = new Map<string, string>();
    const allPropertyIds: string[] = [];
    for (const org of orgs) {
        const { data: props } = await fetchOrgProperties(org.id);
        for (const p of props ?? []) {
            propertyOrgName.set(String(p.id), org.name);
            allPropertyIds.push(String(p.id));
        }
    }
    const { data: rawReservations } = await fetchOrgReservations(allPropertyIds);
    const orgReservations = (rawReservations ?? []).map((r) => ({
        id: r.id,
        organizationName: propertyOrgName.get(r.propertyId) ?? "—",
        propertyName: r.propertyName ?? "—",
        guestName: r.guestName ?? null,
        guestEmail: r.guestEmail ?? null,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        totalPrice: r.totalPrice,
        currency: r.currency,
        code: r.code ?? null,
    }));

    return (
        <>
            {/* Real-time: refresh this view when any reservation/payout changes in an owned org. */}
            {orgs.map((o) => (
                <OrgEventsRefresher key={o.id} orgId={o.id} />
            ))}
            <OrgProfileView
                user={{ id: user.id, name: user.name, email: user.email, image: user.image ?? null, emailVerified: user.emailVerified }}
                balance={balance}
                orgs={orgs}
                reservations={orgReservations}
            />
        </>
    );
}
