"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { ProfilePageShell } from "@/components/profile/profile-page-shell";
import { Icons } from "@/components/icons/iconify";
import { useFullUser } from "@/components/full-user-provider";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { ProfileWizard } from "./profile-wizard";
import { ProfileEditor } from "./profile-editor";
import { PaymentMethodsSection } from "./payment-methods-section";
import { SecuritySection } from "./security-section";
import { NotificationsSection } from "./notifications-section";

export interface MiPerfilClientProps {
    isOrgUser: boolean;
    bookingUrl: string;
    panelUrl: string;
}

export function MiPerfilClient({ isOrgUser, bookingUrl, panelUrl }: MiPerfilClientProps) {
    const t = useTranslations();
    const { user, isLoading } = useFullUser();
    // Start in the wizard when the profile is incomplete; otherwise the editor.
    // The initial mode can only be decided once the real user has loaded, so it
    // is seeded to null and resolved by the effect below. After that first
    // decision, manual transitions (wizard onFinish / editor "step by step"
    // button) take over and must not be overridden.
    const [mode, setMode] = useState<"wizard" | "editor" | null>(null);
    const wizardSeenKey = user ? `qb.profile.wizardSeen:${user.id}` : null;

    useEffect(() => {
        if (isLoading || mode !== null) return;
        // The conversational wizard is a ONE-TIME onboarding: show it only the
        // first time this user opens Mi perfil with an incomplete profile. After
        // that (or if already complete) go straight to the editor — the user can
        // re-enter the wizard manually via "Rellenar paso a paso".
        const isComplete = computeProfileCompleteness(user ?? {}).isComplete;
        let seenWizard = false;
        try {
            seenWizard = !!(wizardSeenKey && localStorage.getItem(wizardSeenKey));
        } catch {
            /* localStorage unavailable — fall back to completeness only */
        }
        if (isComplete || seenWizard) {
            setMode("editor");
        } else {
            setMode("wizard");
            try {
                if (wizardSeenKey) localStorage.setItem(wizardSeenKey, "1");
            } catch {
                /* ignore */
            }
        }
    }, [isLoading, mode, user, wizardSeenKey]);

    return (
        <ProfilePageShell
            title={t("myProfile.title")}
            backPath={isOrgUser ? "/profile/org" : "/profile"}
            icon={
                <div className="rounded-sm bg-purple-100 p-2 dark:bg-purple-900/40">
                    <Icons.userCircle className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
            }
        >
            {/* Skeleton only until the initial mode is decided. Do NOT gate on
                isLoading afterwards: refreshUser() (called on every save) flips
                isLoading true, which would unmount the wizard/editor mid-step and
                remount it fresh at step 0 — making "Siguiente" appear to do nothing. */}
            {mode === null ? (
                <div className="h-40 animate-pulse rounded-sm bg-gray-100 dark:bg-slate-800" />
            ) : mode === "wizard" ? (
                <ProfileWizard onFinish={() => setMode("editor")} />
            ) : (
                <div className="space-y-5">
                    <ProfileEditor />
                    <Button
                        variant="light"
                        size="sm"
                        startContent={<Icon icon="lucide:wand-2" className="size-4" aria-hidden />}
                        onPress={() => setMode("wizard")}
                    >
                        {t("myProfile.stepByStep")}
                    </Button>

                    {/* Everything the user configures now lives here (the old
                        /profile/config page was removed). */}
                    <PaymentMethodsSection
                        isOrgUser={isOrgUser}
                        bookingUrl={bookingUrl}
                        panelUrl={panelUrl}
                    />
                    <SecuritySection />
                    <NotificationsSection />
                </div>
            )}
        </ProfilePageShell>
    );
}
