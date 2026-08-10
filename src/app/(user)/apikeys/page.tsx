import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth.server";
import { ApiKeysManager } from "@/components/apikeys-manager";

/**
 * /apikeys — Identity Hub admin console.
 *
 * Centralizes management of:
 *   • Service Clients (HMAC signing keys derived from SERVICE_AUTH_SECRET)
 *   • API Keys (qbk_… tokens for third parties)
 *   • Scope catalog (single source of truth in src/lib/scopes-catalog.ts)
 *
 * Restricted to users with `isSystemAdmin = true`.
 */
export default async function ApiKeysPage() {
    const { data: user } = await getCurrentUser();
    if (!user) redirect("/");
    const t = await getTranslations();
    if (!user.isSystemAdmin) {
        return (
            <div className="container mx-auto py-14 sm:py-16 md:py-20 px-4 sm:px-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4">{t('apiKeys.page.accessDeniedTitle')}</h1>
                <p className="text-default-600">
                    {t('apiKeys.page.accessDeniedBody')}
                </p>
            </div>
        );
    }
    return (
        <div className="container mx-auto py-14 sm:py-16 md:py-20 px-4 sm:px-6">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('apiKeys.page.title')}</h1>
                <p className="text-default-600 mt-2 max-w-3xl">
                    {t('apiKeys.page.subtitle')}
                </p>
            </div>
            <ApiKeysManager />
        </div>
    );
}
