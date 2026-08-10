"use client";

import { ClientKpiBar } from "./client-view/kpi-bar";
import { OwnerUpgradeCta } from "./client-view/owner-upgrade-cta";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { useFullUser } from "@/components/full-user-provider";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { ProfileProgressRing } from "@/components/profile/personal/profile-progress-ring";

interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    isSystemAdmin?: boolean;
    createdAt: Date;
}

interface ProfileContentProps {
    user: User;
    kpiData: { activeCount: number; completedCount: number; totalSpentCents: number };
    showUpgradeCta: boolean;
    isOwnerViewingAsClient: boolean;
    panelUrl?: string;
}

export function ProfileContent({
    user,
    kpiData,
    showUpgradeCta,
    isOwnerViewingAsClient,
    panelUrl = "https://panel.hostravel.net",
}: ProfileContentProps) {
    const t = useTranslations();
    const { user: fullUser } = useFullUser();
    const completeness = fullUser ? computeProfileCompleteness(fullUser) : null;
    const userInitial = user.name?.[0]?.toUpperCase() || "?";

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* User header */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5 p-5">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 bg-[#0A2252]"
                        style={user.image ? {} : undefined}
                    >
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="w-16 h-16 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            userInitial
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-900 truncate">{user.name}</h2>
                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.emailVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                        }`}>
                            <Icons.checkCircle className="w-3 h-3" />
                            {user.emailVerified ? t('profile.emailVerified') : t('profile.emailNotVerified')}
                        </span>
                    </div>
                    <Link
                        href="/profile/me"
                        className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0A2252] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0A2252]/90"
                    >
                        <Icons.userCircle className="size-4" />
                        {t('profile.settings')}
                        <Icon icon="lucide:chevron-right" className="size-4" aria-hidden />
                    </Link>
                    <Link
                        href="/profile/me"
                        aria-label={t('profile.settings')}
                        className="sm:hidden shrink-0 rounded-lg bg-[#0A2252] p-2 text-white hover:bg-[#0A2252]/90"
                    >
                        <Icons.userCircle className="size-4" />
                    </Link>
                </div>

                {/* Profile completeness — same card, links to Mi perfil */}
                {completeness && (
                    <Link
                        href="/profile/me"
                        className="flex items-center gap-4 px-5 py-4 border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                        <ProfileProgressRing percent={completeness.percent} size={44} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                                {completeness.isComplete
                                    ? t('profilePages.completeness.complete')
                                    : t('profilePages.completeness.percentComplete', { percent: completeness.percent })}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {completeness.isComplete
                                    ? t('profilePages.completeness.viewAndEdit')
                                    : t('profilePages.completeness.completeYourData')}
                            </p>
                        </div>
                        <Icon icon="lucide:chevron-right" className="size-5 shrink-0 text-slate-400" aria-hidden />
                    </Link>
                )}
            </div>

            {/* Back to org link */}
            {isOwnerViewingAsClient && (
                <div className="flex justify-end">
                    <Link
                        href="/profile/org"
                        className="text-sm text-[#0A2252] hover:underline flex items-center gap-1"
                    >
                        ← {t('clientView.backToOrg')}
                    </Link>
                </div>
            )}

            {/* KPI bar */}
            <ClientKpiBar
                activeCount={kpiData.activeCount}
                completedCount={kpiData.completedCount}
                totalSpentCents={kpiData.totalSpentCents}
            />

            {/* Aqui iban facturas, reservas, bonos y servicios: son del negocio de
                alojamientos de QuickBook. En Procovar el perfil es solo la cuenta
                de la persona. */}

            {/* Upgrade CTA */}
            {showUpgradeCta && <OwnerUpgradeCta panelUrl={panelUrl} />}
        </div>
    );
}
