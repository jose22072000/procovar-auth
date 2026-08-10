"use client";

/**
 * Header bell: unread badge + the latest notifications.
 *
 * Everything shown here is rendered from `payload.title` / `payload.body` — the
 * inbox API returns no rendered copy. Data comes from /api/notifications, which
 * resolves the user from the session; this component never sees a userId, a
 * notify URL or the HMAC key.
 *
 * Desktop gets a dropdown panel, mobile a Drawer (house rule: no modals on mobile).
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { cn, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { authClient } from "@/lib/auth-client";
import { useNotifications } from "@/hooks/use-notifications";
import { notificationHref, type InboxNotification } from "@/lib/notify/types";
import { notificationBody, notificationTitle, relativeTime } from "@/lib/notify/format";

const useIsMobile = () => {
    // Starts false so server and first client render agree; corrected on mount.
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const query = window.matchMedia("(max-width: 767px)");
        const sync = () => setIsMobile(query.matches);
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);
    return isMobile;
};

interface ListProps {
    notifications: InboxNotification[];
    loading: boolean;
    onSelect: (n: InboxNotification) => void;
    /** The drawer is on a light surface, the dropdown on the navy panel. */
    variant: "panel" | "drawer";
}

function NotificationList({ notifications, loading, onSelect, variant }: ListProps) {
    const t = useTranslations();
    const locale = useLocale();
    const dark = variant === "panel";

    if (loading) {
        return (
            <div className={cn("py-10 text-center text-sm", dark ? "text-white/40" : "text-gray-400")}>
                {t("profilePages.notifications.loading")}
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <div
                    className={cn(
                        "flex size-10 items-center justify-center rounded-full",
                        dark ? "bg-white/5" : "bg-gray-100 dark:bg-slate-800",
                    )}
                >
                    <Icons.bell className={cn("size-5", dark ? "text-white/25" : "text-gray-400")} />
                </div>
                <div className="text-center">
                    <p className={cn("text-sm font-medium", dark ? "text-white/40" : "text-gray-500")}>
                        {t("nav.noNotifications")}
                    </p>
                    <p className={cn("mt-0.5 text-xs", dark ? "text-white/20" : "text-gray-400")}>
                        {t("nav.noNotificationsHint")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-1">
            {notifications.map((n) => {
                const unread = !n.readAt;
                return (
                    <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelect(n)}
                        className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                            dark
                                ? unread
                                    ? "bg-blue-500/[0.055] hover:bg-white/[0.04]"
                                    : "hover:bg-white/[0.04]"
                                : unread
                                  ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
                                  : "hover:bg-gray-50 dark:hover:bg-slate-800",
                        )}
                    >
                        <span
                            className={cn(
                                "mt-1.5 size-2 shrink-0 rounded-full",
                                unread ? "bg-blue-500" : dark ? "bg-white/20" : "bg-gray-300 dark:bg-gray-600",
                            )}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                                <span
                                    className={cn(
                                        "truncate text-sm leading-snug",
                                        dark
                                            ? unread
                                                ? "font-semibold text-white"
                                                : "text-white/50"
                                            : unread
                                              ? "font-semibold text-gray-900 dark:text-white"
                                              : "text-gray-600 dark:text-gray-400",
                                    )}
                                >
                                    {notificationTitle(n)}
                                </span>
                                <span
                                    className={cn(
                                        "shrink-0 text-[10px]",
                                        dark ? "text-white/25" : "text-gray-400",
                                    )}
                                >
                                    {relativeTime(n.createdAt, locale)}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    "mt-0.5 line-clamp-2 block text-xs",
                                    dark ? "text-white/35" : "text-gray-500 dark:text-gray-400",
                                )}
                            >
                                {notificationBody(n)}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

export function NotificationBell() {
    const t = useTranslations();
    const router = useRouter();
    const isMobile = useIsMobile();
    const { data: session } = authClient.useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const { notifications, unreadCount, loading, markRead, archiveAllRead } = useNotifications({
        filter: "all",
        limit: 10,
        live: true,
    });

    useEffect(() => {
        const handler = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Logged out there is no inbox — and no point calling the API.
    if (!session?.user) return null;

    const select = async (n: InboxNotification) => {
        setOpen(false);
        if (!n.readAt) void markRead(n.id);
        // Destination is derived from the payload here; the payload never carries a URL.
        router.push(notificationHref(n.payload) ?? `/profile/notifications/${n.id}`);
    };

    const markAllRead = () => {
        // "Mark all read" upstream is archive-read (bulk); per-item read keeps the
        // list visible, so read them one by one and let the centre archive in bulk.
        notifications.filter((n) => !n.readAt).forEach((n) => void markRead(n.id));
    };

    const trigger = (
        <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors",
                open ? "border-white/40 bg-white/10 text-white" : "border-white/25 text-white hover:bg-white/10",
            )}
            aria-label={t("nav.notificationsAria")}
            aria-expanded={open}
        >
            <Icons.bell className="size-5" />
            {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none tabular-nums text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
        </button>
    );

    const footer = (
        <NextLink
            href="/profile/notifications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
            {t("nav.manageNotifications")}
            <span className="opacity-50">→</span>
        </NextLink>
    );

    return (
        <div className="relative" ref={ref}>
            {trigger}

            {/* Mobile: drawer (house rule — no modals on small screens). */}
            {isMobile ? (
                <Drawer isOpen={open} placement="bottom" onOpenChange={setOpen} size="lg">
                    <DrawerContent>
                        <DrawerHeader className="flex items-center justify-between gap-2">
                            <span className="text-base font-semibold">{t("nav.notifications")}</span>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    className="text-xs font-medium text-blue-600 dark:text-blue-400"
                                >
                                    {t("nav.markAllRead")}
                                </button>
                            )}
                        </DrawerHeader>
                        <DrawerBody className="px-0">
                            <NotificationList
                                notifications={notifications}
                                loading={loading}
                                onSelect={select}
                                variant="drawer"
                            />
                        </DrawerBody>
                        <DrawerFooter className="p-0">{footer}</DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                open && (
                    <div
                        className="absolute right-0 top-11 z-[300] flex w-[320px] flex-col overflow-hidden rounded-xl"
                        style={{
                            background: "linear-gradient(160deg, #0B1535 0%, #060F2A 100%)",
                            border: "1px solid rgba(255,255,255,0.11)",
                            boxShadow: "0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
                        }}
                    >
                        <div className="flex items-center justify-between px-4 pb-3 pt-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                                    {t("nav.notifications")}
                                </span>
                                {unreadCount > 0 && (
                                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500/20 px-1 text-[10px] font-bold tabular-nums text-blue-300">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllRead}
                                        className="text-[11px] text-white/35 transition-colors hover:text-white/70"
                                    >
                                        {t("nav.markAllRead")}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => void archiveAllRead()}
                                    className="text-[11px] text-white/35 transition-colors hover:text-white/70"
                                >
                                    {t("profilePages.notifications.archiveAllRead")}
                                </button>
                            </div>
                        </div>

                        <div className="mx-4 h-px bg-white/[0.07]" />

                        <div className="max-h-[336px] overflow-y-auto">
                            <NotificationList
                                notifications={notifications}
                                loading={loading}
                                onSelect={select}
                                variant="panel"
                            />
                        </div>

                        <div className="border-t border-white/[0.07] bg-black/25">
                            <NextLink
                                href="/profile/notifications"
                                onClick={() => setOpen(false)}
                                className="flex w-full items-center justify-center gap-1.5 py-3 text-xs font-medium text-white/45 transition-colors hover:text-white/90"
                            >
                                {t("nav.manageNotifications")}
                                <span className="opacity-50">→</span>
                            </NextLink>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
