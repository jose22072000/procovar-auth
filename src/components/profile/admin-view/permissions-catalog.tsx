"use client";

import { useMemo, useState } from "react";
import { Button, Chip, Input, Tooltip, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Perm = {
    key: string;
    group: string;
    service: string;
    label: { es?: string; en?: string } | null;
};

export function PermissionsCatalog({ permissions }: { permissions: Perm[] }) {
    const t = useTranslations();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [query, setQuery] = useState("");

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? permissions.filter((p) =>
                p.key.toLowerCase().includes(q) ||
                (p.label?.es ?? "").toLowerCase().includes(q) ||
                (p.label?.en ?? "").toLowerCase().includes(q) ||
                p.service.toLowerCase().includes(q))
            : permissions;
        const map = new Map<string, Perm[]>();
        for (const p of filtered) {
            if (!map.has(p.group)) map.set(p.group, []);
            map.get(p.group)!.push(p);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [permissions, query]);

    const serviceCount = useMemo(() => new Set(permissions.map((p) => p.service)).size, [permissions]);

    const sync = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/rbac/sync", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                addToast({
                    title: t("myProfile.admin.permissionsCatalog.syncSuccessTitle"),
                    description: t("myProfile.admin.permissionsCatalog.syncSuccessDescription", {
                        permissions: data.permissions ?? 0,
                        orgs: data.orgs ?? 0,
                    }),
                    color: "success",
                });
                router.refresh();
            } else {
                addToast({
                    title: t("myProfile.admin.permissionsCatalog.syncErrorTitle"),
                    description: data.error ?? "",
                    color: "danger",
                });
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-[#0A2252]/8 text-[#0A2252] dark:bg-white/10 dark:text-sky-400">
                        <Icon icon="lucide:shield-check" className="size-5" aria-hidden />
                    </span>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("myProfile.admin.permissionsCatalog.title")}</h2>
                        <p className="text-sm text-slate-500">
                            {t("myProfile.admin.permissionsCatalog.description")}
                        </p>
                        {permissions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <Chip size="sm" variant="flat" startContent={<Icon icon="lucide:key-round" className="ml-1 size-3.5" aria-hidden />}>{t("myProfile.admin.permissionsCatalog.permissionsCount", { count: permissions.length })}</Chip>
                                <Chip size="sm" variant="flat" startContent={<Icon icon="lucide:layers" className="ml-1 size-3.5" aria-hidden />}>{t("myProfile.admin.permissionsCatalog.groupsCount", { count: groups.length })}</Chip>
                                <Chip size="sm" variant="flat" startContent={<Icon icon="lucide:server" className="ml-1 size-3.5" aria-hidden />}>{t("myProfile.admin.permissionsCatalog.servicesCount", { count: serviceCount })}</Chip>
                            </div>
                        )}
                    </div>
                </div>
                <Button variant="bordered" color="primary" isLoading={busy} onPress={sync} className="shrink-0"
                    startContent={!busy ? <Icon icon="lucide:refresh-cw" className="size-4" aria-hidden /> : undefined}>
                    {t("myProfile.admin.permissionsCatalog.syncButton")}
                </Button>
            </div>

            {permissions.length === 0 ? (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    <Icon icon="lucide:triangle-alert" className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                        {t("myProfile.admin.permissionsCatalog.emptyPrefix")}{" "}
                        <strong>{t("myProfile.admin.permissionsCatalog.syncButton")}</strong>{" "}
                        {t("myProfile.admin.permissionsCatalog.emptySuffix")}
                    </span>
                </div>
            ) : (
                <>
                    <Input
                        className="mb-4 max-w-xs" variant="bordered" size="sm" label={t("myProfile.admin.permissionsCatalog.searchLabel")} labelPlacement="outside"
                        placeholder={t("myProfile.admin.permissionsCatalog.searchPlaceholder")} value={query} onValueChange={setQuery} isClearable onClear={() => setQuery("")}
                        startContent={<Icon icon="lucide:search" className="size-4 text-slate-400" aria-hidden />}
                    />
                    {groups.length === 0 ? (
                        <div className="rounded-md border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
                            {t("myProfile.admin.permissionsCatalog.noMatch", { query })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groups.map(([group, perms]) => (
                                <div key={group} className="rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                                        <Icon icon="lucide:folder-lock" className="size-4 text-slate-400" aria-hidden />
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{group}</h3>
                                        <Chip size="sm" variant="flat" className="ml-auto">{perms.length}</Chip>
                                    </div>
                                    <div className="flex flex-wrap gap-2 p-3">
                                        {perms.map((p) => (
                                            <Tooltip key={p.key} content={<span className="font-mono text-xs">{p.service} · {p.key}</span>} delay={400}>
                                                <Chip size="sm" variant="flat" className="gap-1">
                                                    <span className="font-medium">{p.label?.es ?? p.key}</span>
                                                    <span className="font-mono text-[10px] text-slate-400">{p.key}</span>
                                                </Chip>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
