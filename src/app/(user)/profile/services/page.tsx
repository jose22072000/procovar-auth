"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Chip, Input } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";

export default function ServicesPage() {
    const router = useRouter();
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const services = useProfileDataStore((s) => s.services);

    const filtered = services.filter(
        (svc) =>
            svc.name.toLowerCase().includes(search.toLowerCase()) ||
            svc.propertyName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProfilePageShell
            title={t("profilePages.services.title")}
            icon={
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-sm">
                    <Icons.service className="size-5 text-green-600 dark:text-green-400" />
                </div>
            }
            count={filtered.length}
        >
            <div className="mb-4">
                <Input
                    placeholder={t("profilePages.services.searchPlaceholder")}
                    value={search}
                    onValueChange={setSearch}
                    startContent={<Icons.search className="size-4 text-gray-400" />}
                    size="sm"
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-800" }}
                />
            </div>

            <div className="grid gap-3">
                {filtered.map((svc) => (
                    <div
                        key={svc.id}
                        onClick={() => router.push(`/profile/services/${svc.id}`)}
                        className="flex items-center justify-between p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-sm shrink-0">
                                <Icons.service className="size-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{svc.name}</p>
                                <p className="text-xs text-gray-400">{svc.propertyName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {svc.status === "active" ? (
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-gray-400">{t("profilePages.services.nextPayment")}</p>
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{svc.nextPayment}</p>
                                </div>
                            ) : null}
                            <Chip radius="sm"
                                size="sm"
                                color={svc.status === "active" ? "success" : "default"}
                                variant="flat"
                                className="capitalize text-xs"
                            >
                                {t.has(`profilePages.services.status.${svc.status}`)
                                    ? t(`profilePages.services.status.${svc.status}`)
                                    : svc.status}
                            </Chip>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-12 text-center text-gray-400">{t("profilePages.services.empty")}</div>
                )}
            </div>
        </ProfilePageShell>
    );
}
