"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";

interface OwnerProfileViewProps {
    user: { id: string; name: string; email: string; image?: string | null; emailVerified: boolean };
}

export function OrgProfileView({ user }: OwnerProfileViewProps) {
    const t = useTranslations();
    const userInitial = user.name?.[0]?.toUpperCase() || "?";

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* User header */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5 p-5">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 bg-[#0A2252]">
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
                        className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <Icons.userCircle className="size-4" />
                        {t('profile.settings')}
                    </Link>
                    <Link
                        href="/profile/me"
                        className="sm:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        <Icons.userCircle className="size-4" />
                    </Link>
                </div>
            </div>

            {/* Switch to client view */}
            <div className="flex justify-end">
                <Link
                    href="/profile?view=client"
                    className="text-sm text-[#0A2252] hover:underline flex items-center gap-1"
                >
                    Ver como cliente →
                </Link>
            </div>

            {/* Aqui iban el saldo del propietario, los pagos, las reservas y los
                servicios: todo eso es del negocio de alojamientos de QuickBook.
                En Procovar una organizacion son personas, no propiedades. */}
        </div>
    );
}
