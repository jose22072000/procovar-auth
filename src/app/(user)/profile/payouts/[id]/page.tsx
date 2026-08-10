import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { resolveProfileRole } from "@/lib/role-resolver";
import { prisma } from "@/lib/prisma";
import { fetchOwnerBalance } from "../../_actions";
import { PayoutDetailView } from "./_payout-detail-view";
import type { Member } from "@/components/full-user-provider";

export default async function PayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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

    const balResult = await fetchOwnerBalance();
    const payout = (balResult.data?.payouts ?? []).find((p) => p.id === id) ?? null;
    const orgName = payout
        ? members.find((m) => m.organization.id === payout.organizationId)?.organization.name ?? "—"
        : "—";

    return <PayoutDetailView payout={payout} organizationName={orgName} />;
}
