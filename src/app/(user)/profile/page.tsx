import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/profile/profile-content";
import { resolveProfileRole } from "@/lib/role-resolver";
import { fetchUserReservations, fetchUserInvoices } from "./_actions";

export default async function ProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    const params = await searchParams;
    const role = await resolveProfileRole({
        id: user.id,
        isSystemAdmin: user.isSystemAdmin ?? false,
        members: (user as any).members ?? [],
    });

    // Admins default to their dashboard, but can preview the client view with
    // ?view=client (same user acts as all 3 roles during testing).
    if (role === "admin" && params.view !== "client") redirect("/dashboard");
    if ((role === "org-full" || role === "org-restricted") && params.view !== "client") {
        redirect("/profile/org");
    }

    const panelUrl = process.env.QB_PANEL_URL ?? "https://panel.hostravel.net";
    const [resResult, invResult] = await Promise.all([
        fetchUserReservations(),
        fetchUserInvoices(),
    ]);

    const reservations = resResult.data ?? [];
    const invoices = invResult.data ?? [];

    const activeCount = reservations.filter(
        (r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN"
    ).length;
    const completedCount = reservations.filter((r) => r.status === "CHECKED_OUT").length;
    const totalSpentCents = invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.amount, 0);

    const hasOrg = role === "org-full" || role === "org-restricted";

    return (
        <ProfileContent
            user={user}
            kpiData={{ activeCount, completedCount, totalSpentCents }}
            showUpgradeCta={!hasOrg}
            isOwnerViewingAsClient={hasOrg}
            panelUrl={panelUrl}
        />
    );
}
