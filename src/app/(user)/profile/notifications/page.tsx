"use client";

/**
 * Notification centre — the full inbox behind the header bell.
 *
 * Backed by /api/notifications (session-scoped server side); this component
 * never sends a userId and never talks to QB Notify directly. All copy comes
 * from `payload.title` / `payload.body`: the inbox API renders nothing.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useNotifications } from "@/hooks/use-notifications";
import { notificationHref, type InboxFilter, type InboxNotification } from "@/lib/notify/types";
import {
    notificationBody,
    notificationColor,
    notificationTitle,
    relativeTime,
} from "@/lib/notify/format";

const FILTERS: InboxFilter[] = ["unread", "all", "archived"];

export default function NotificationsPage() {
    const router = useRouter();
    const t = useTranslations();
    const locale = useLocale();
    const [filter, setFilter] = useState<InboxFilter>("all");

    const { notifications, unreadCount, loading, pending, markRead, archive, unarchive, archiveAllRead } =
        useNotifications({ filter, limit: 50 });

    const open = (n: InboxNotification) => {
        if (!n.readAt) void markRead(n.id);
        router.push(`/profile/notifications/${n.id}`);
    };

    const go = (n: InboxNotification) => {
        if (!n.readAt) void markRead(n.id);
        // Derived from the payload — qb-back never sends a URL, by design.
        const href = notificationHref(n.payload);
        if (href) router.push(href);
    };

    return (
        <ProfilePageShell
            title={t("profilePages.notifications.title")}
            icon={
                <div className="rounded-sm bg-blue-100 p-2 dark:bg-blue-900/30">
                    <Icons.bell className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
            }
            count={notifications.length}
        >
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((value) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                                filter === value
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                            }`}
                        >
                            {t(`profilePages.notifications.filters.${value}`)}
                            {value === "unread" && unreadCount > 0 && ` (${unreadCount})`}
                        </button>
                    ))}
                </div>

                {filter !== "archived" && (
                    <Button
                        size="sm"
                        variant="bordered"
                        className="text-xs"
                        startContent={<Icons.archive className="size-4" />}
                        onPress={() => void archiveAllRead()}
                    >
                        {t("profilePages.notifications.archiveAllRead")}
                    </Button>
                )}
            </div>

            {/* List */}
            {loading ? (
                <div className="py-12 text-center text-gray-400">
                    {t("profilePages.notifications.loading")}
                </div>
            ) : (
                <div className="grid gap-2">
                    {notifications.map((n) => {
                        const unread = !n.readAt;
                        const href = notificationHref(n.payload);
                        return (
                            <div
                                key={n.id}
                                className={`flex gap-3 rounded-sm border p-3 transition-colors md:p-4 ${
                                    unread
                                        ? "border-blue-100 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/20"
                                        : "border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-800/50"
                                }`}
                            >
                                <div
                                    className={`mt-1.5 size-2 shrink-0 rounded-sm ${
                                        unread ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                                    }`}
                                />

                                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => open(n)}>
                                    <div className="flex flex-wrap items-start gap-2">
                                        <p
                                            className={`min-w-0 flex-1 text-sm font-semibold ${
                                                unread
                                                    ? "text-gray-900 dark:text-white"
                                                    : "text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            {notificationTitle(n)}
                                        </p>
                                        <div className="flex shrink-0 gap-1">
                                            <Chip
                                                radius="sm"
                                                size="sm"
                                                color={notificationColor(n.payload)}
                                                variant="flat"
                                                className="text-xs"
                                            >
                                                {n.payload.propertyName ?? n.payload.code ?? n.notificationType}
                                            </Chip>
                                            {unread && (
                                                <Chip radius="sm" size="sm" color="primary" variant="solid" className="text-xs">
                                                    {t("profilePages.notifications.new")}
                                                </Chip>
                                            )}
                                        </div>
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                        {notificationBody(n)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">{relativeTime(n.createdAt, locale)}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex shrink-0 flex-col gap-1">
                                    {unread && (
                                        <button
                                            title={t("profilePages.notifications.markAsRead")}
                                            disabled={pending === n.id}
                                            onClick={() => void markRead(n.id)}
                                            className="rounded-sm p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                                        >
                                            <Icons.eye className="size-4 text-blue-500" />
                                        </button>
                                    )}
                                    {href && (
                                        <button
                                            title={t("profilePages.notifications.viewDetail")}
                                            onClick={() => go(n)}
                                            className="rounded-sm p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                                        >
                                            <Icons.chevronRight className="size-4 text-gray-400" />
                                        </button>
                                    )}
                                    {n.archivedAt ? (
                                        <button
                                            title={t("profilePages.notifications.unarchive")}
                                            disabled={pending === n.id}
                                            onClick={() => void unarchive(n.id)}
                                            className="rounded-sm p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                                        >
                                            <Icons.eyeClosed className="size-4 text-gray-400" />
                                        </button>
                                    ) : (
                                        <button
                                            title={t("profilePages.notifications.archive")}
                                            disabled={pending === n.id}
                                            onClick={() => void archive(n.id)}
                                            className="rounded-sm p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
                                        >
                                            <Icons.trashIcon className="size-4 text-gray-400 hover:text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {notifications.length === 0 && (
                        <div className="py-12 text-center text-gray-400">
                            {t("profilePages.notifications.empty")}
                        </div>
                    )}
                </div>
            )}
        </ProfilePageShell>
    );
}
