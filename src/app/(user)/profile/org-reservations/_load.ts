import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { prisma } from "@/lib/prisma";
import { fetchOrgProperties, fetchOrgReservations } from "../_actions";
import type { OrgReservation } from "@/components/profile/org-view/org-reservations-card";
import type { Member } from "@/components/full-user-provider";

/**
 * Load every reservation across the current user's organizations, shaped as
 * `OrgReservation`. Shared by the org-reservations list page and the per-id
 * detail page so both see the exact same data. Redirects non-org users away.
 */
export async function loadOrgReservationsForCurrentUser(): Promise<OrgReservation[]> {
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
                organization: { select: { id: true, name: true, slug: true, logo: true, metadata: true, createdAt: true } },
            },
        });
        members = dbMembers.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
            organization: { ...m.organization, createdAt: m.organization.createdAt.toISOString() },
        }));
    }

    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
        members: members.map((m) => ({ role: m.role, organizationId: m.organizationId })),
    });
    if (role === "client") redirect("/profile");

    const orgs = members.map((m) => ({ id: m.organization.id, name: m.organization.name }));
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
    return (rawReservations ?? []).map((r) => ({
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
}
