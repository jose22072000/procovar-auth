"use client";

import { Card, CardBody, CardHeader, Chip, Button, ScrollShadow, Skeleton } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { useNotifications } from "@/hooks/use-notifications";
import { notificationBody, notificationTitle, relativeTime } from "@/lib/notify/format";

function NotificationSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-sm bg-gray-50 dark:bg-slate-800/40">
                    <div className="flex justify-between items-start gap-2">
                        <Skeleton className="h-4 w-40 rounded-sm" />
                        <Skeleton className="h-5 w-14 rounded-sm" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-sm mt-2" />
                    <Skeleton className="h-3 w-2/3 rounded-sm mt-1" />
                    <Skeleton className="h-3 w-20 rounded-sm mt-2" />
                </div>
            ))}
        </div>
    );
}

export function NotificationsCard() {
    const router = useRouter();
    const t = useTranslations();
    const locale = useLocale();
    // Session-scoped server side: no userId ever leaves the browser.
    const { notifications, loading } = useNotifications({ filter: "all", limit: 20 });

    const visibleCount = Math.min(3, notifications.length);

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 rounded-sm">
                        <Icons.dialog className="size-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('cards.notifications')}</h3>
                        {loading ? (
                            <Skeleton className="h-3 w-24 rounded-sm mt-1" />
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('cards.showingOf', { shown: visibleCount, total: notifications.length })}</p>
                        )}
                    </div>
                </div>
                <Button size="sm" variant="light" className="text-blue-600 dark:text-blue-300 font-medium text-xs" onPress={() => router.push("/profile/notifications")}>{t('cards.viewAll')}</Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <ScrollShadow hideScrollBar className="h-[20rem] md:h-[22rem]">
                    {loading ? (
                        <NotificationSkeleton />
                    ) : notifications.length > 0 ? (
                        <div className="space-y-2">
                            {notifications.map((notification) => {
                                const read = Boolean(notification.readAt);
                                return (
                                    <div key={notification.id} onClick={() => router.push(`/profile/notifications/${notification.id}`)} className={`p-3 rounded-sm transition-colors cursor-pointer ${read ? 'bg-gray-50 dark:bg-slate-800/40 hover:bg-gray-100 dark:hover:bg-blue-800' : 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-semibold text-black dark:text-white text-sm truncate flex-1">{notificationTitle(notification)}</p>
                                            <Chip radius="sm" size="sm" color={read ? "success" : "warning"} variant="flat" className="text-xs shrink-0">{read ? t('cards.read') : t('cards.unread')}</Chip>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{notificationBody(notification)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{relativeTime(notification.createdAt, locale)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('cards.noNotifications')}</p>
                    )}
                </ScrollShadow>
            </CardBody>
        </Card>
    );
}
