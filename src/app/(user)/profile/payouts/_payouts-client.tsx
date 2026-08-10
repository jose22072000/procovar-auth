"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Chip, Input, Select, SelectItem, Pagination } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import type { OwnerBalancePayout } from "../_actions";
import { type PayoutWithOrg } from "@/components/profile/org-view/payout-detail-drawer";

interface PayoutsClientProps {
    payouts: OwnerBalancePayout[];
    orgs: { id: string; name: string; slug: string }[];
}

const STATUS: Record<string, { color: "success" | "warning" | "danger" | "default" }> = {
    PAID: { color: "success" },
    PENDING: { color: "warning" },
    FAILED: { color: "danger" },
    CANCELLED: { color: "default" },
};

const ROWS_PER_PAGE = 8;

function fmt(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export function PayoutsClient({ payouts, orgs }: PayoutsClientProps) {
    const router = useRouter();
    const t = useTranslations();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);

    const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
    const orgName = (id: string | null) => (id ? orgById.get(id)?.name ?? "—" : "—");

    const withOrg: PayoutWithOrg[] = useMemo(
        () => payouts.map((p) => ({ ...p, organizationName: orgName(p.organizationId) })),
        [payouts, orgById],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return withOrg.filter((p) => {
            if (status !== "ALL" && p.status !== status) return false;
            if (q === "") return true;
            return p.organizationName.toLowerCase().includes(q) || (p.invoiceNumber ?? "").toLowerCase().includes(q);
        });
    }, [withOrg, search, status]);

    const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    useEffect(() => { setPage(1); }, [search, status]);
    const pageItems = useMemo(() => filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE), [filtered, page]);

    return (
        <ProfilePageShell
            title={t("profilePages.payouts.title")}
            icon={
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm">
                    <Icons.wallet className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
            }
            count={filtered.length}
        >
            <div className="mb-4 flex flex-wrap gap-3">
                <Input
                    className="max-w-xs"
                    placeholder={t("profilePages.payouts.searchPlaceholder")}
                    value={search}
                    onValueChange={setSearch}
                    startContent={<Icons.search className="size-4 text-gray-400" />}
                    size="sm"
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-800" }}
                />
                <Select
                    className="max-w-[12rem]"
                    size="sm"
                    selectedKeys={[status]}
                    onSelectionChange={(keys) => setStatus(String(Array.from(keys)[0] ?? "ALL"))}
                    aria-label={t("profilePages.payouts.filterAriaLabel")}
                    classNames={{ trigger: "bg-gray-50 dark:bg-slate-800" }}
                >
                    <SelectItem key="ALL">{t("profilePages.payouts.allStatuses")}</SelectItem>
                    <SelectItem key="PENDING">{t("profilePages.payouts.status.PENDING")}</SelectItem>
                    <SelectItem key="PAID">{t("profilePages.payouts.status.PAID")}</SelectItem>
                    <SelectItem key="FAILED">{t("profilePages.payouts.status.FAILED")}</SelectItem>
                    <SelectItem key="CANCELLED">{t("profilePages.payouts.status.CANCELLED")}</SelectItem>
                </Select>
            </div>

            <div className="grid gap-3">
                {pageItems.map((p) => {
                    const st = STATUS[p.status] ?? { color: "default" as const };
                    const statusLabel = t.has(`profilePages.payouts.status.${p.status}`)
                        ? t(`profilePages.payouts.status.${p.status}`)
                        : p.status;
                    return (
                        <button
                            type="button"
                            key={p.id}
                            onClick={() => router.push(`/profile/payouts/${p.id}`)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 rounded-sm bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-left hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm shrink-0">
                                    <Icons.wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                        {p.organizationName}
                                        {p.invoiceNumber ? <span className="ml-1 text-xs text-gray-400 font-mono">{p.invoiceNumber}</span> : null}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description ?? t("profilePages.payouts.lineCount", { count: p.lineCount })}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {(p.amount / 100).toFixed(2)} {p.currency}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{fmt(p.issuedAt)}</span>
                                    <Chip radius="sm" size="sm" color={st.color} variant="flat" className="text-xs">{statusLabel}</Chip>
                                </div>
                            </div>
                        </button>
                    );
                })}

                {filtered.length === 0 && <div className="py-12 text-center text-gray-400">{t("profilePages.payouts.empty")}</div>}
            </div>

            {pages > 1 && (
                <div className="mt-4 flex justify-center">
                    <Pagination showControls page={page} total={pages} onChange={setPage} />
                </div>
            )}
        </ProfilePageShell>
    );
}
