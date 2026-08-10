"use client";

import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { useProfileDataStore } from "@/stores/store.profile-data";
import { SectionCard, ToggleRow } from "./section-card";

export function NotificationsSection() {
    const t = useTranslations();
    const notificationSettings = useProfileDataStore((s) => s.notificationSettings);
    const updateNotificationSettings = useProfileDataStore((s) => s.updateNotificationSettings);

    return (
        <SectionCard
            icon={<Icons.bell className="size-5 text-blue-600 dark:text-blue-400" />}
            title={t("myProfile.notifications.title")}
        >
            <div className="space-y-4">
                <ToggleRow
                    label={t("myProfile.notifications.email.label")}
                    description={t("myProfile.notifications.email.description")}
                    checked={notificationSettings.emailNotifications}
                    onChange={(v) => updateNotificationSettings({ emailNotifications: v })}
                />
                <ToggleRow
                    label={t("myProfile.notifications.bookingConfirmations.label")}
                    description={t("myProfile.notifications.bookingConfirmations.description")}
                    checked={notificationSettings.bookingConfirmations}
                    onChange={(v) => updateNotificationSettings({ bookingConfirmations: v })}
                />
                <ToggleRow
                    label={t("myProfile.notifications.invoiceAlerts.label")}
                    description={t("myProfile.notifications.invoiceAlerts.description")}
                    checked={notificationSettings.invoiceAlerts}
                    onChange={(v) => updateNotificationSettings({ invoiceAlerts: v })}
                />
                <ToggleRow
                    label={t("myProfile.notifications.serviceAlerts.label")}
                    description={t("myProfile.notifications.serviceAlerts.description")}
                    checked={notificationSettings.serviceAlerts}
                    onChange={(v) => updateNotificationSettings({ serviceAlerts: v })}
                />
                <ToggleRow
                    label={t("myProfile.notifications.marketingEmails.label")}
                    description={t("myProfile.notifications.marketingEmails.description")}
                    checked={notificationSettings.marketingEmails}
                    onChange={(v) => updateNotificationSettings({ marketingEmails: v })}
                />
            </div>
        </SectionCard>
    );
}
