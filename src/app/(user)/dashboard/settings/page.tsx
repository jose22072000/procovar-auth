import { AdminDashboard } from "@/components/admin-dashboard";
import { PlatformSettings } from "@/components/profile/admin-view/platform-settings";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export default async function DashboardSettingsPage() {
    const t = await getTranslations();
    const initialClientsRaw = await prisma.clientApp.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            clientId: true,
            name: true,
            description: true,
            allowedCallbackUrls: true,
            allowedDomains: true,
            scopes: true,
            signingKeyVersion: true,
            active: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    const initialClients = initialClientsRaw.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.settingsPage.title')}</h1>
            <PlatformSettings />
            <AdminDashboard initialClients={initialClients} />
        </div>
    );
}
