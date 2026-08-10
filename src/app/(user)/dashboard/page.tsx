import { getCurrentUser } from "@/server/auth.server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");

    if (!user.isSystemAdmin) {
        const t = await getTranslations();
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-2xl font-bold text-red-600 mb-4">{t('dashboard.accessDenied.title')}</h1>
                <p className="text-slate-500">{t('dashboard.accessDenied.description')}</p>
            </div>
        );
    }

    redirect("/dashboard/settings");
}
