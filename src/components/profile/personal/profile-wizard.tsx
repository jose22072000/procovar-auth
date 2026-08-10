"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { useFullUser } from "@/components/full-user-provider";
import { authClient } from "@/lib/auth-client";
import { computeProfileCompleteness, PROFILE_FIELDS, type ProfileFieldKey } from "@/lib/profile-completeness";
import { ConfettiBurst } from "./confetti-burst";

export function ProfileWizard({ onFinish }: { onFinish: () => void }) {
    const t = useTranslations();
    const { user, refreshUser } = useFullUser();
    const [step, setStep] = useState(0);
    const [value, setValue] = useState<string>(
        (user?.[PROFILE_FIELDS[0].key] as string | null | undefined) ?? "",
    );
    const [saving, setSaving] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const field = PROFILE_FIELDS[step];
    const total = PROFILE_FIELDS.length;
    const progress = Math.round(((step + 1) / total) * 100);

    useEffect(() => {
        return () => {
            if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
        };
    }, []);

    function loadValueFor(nextStep: number) {
        const key = PROFILE_FIELDS[nextStep]?.key as ProfileFieldKey | undefined;
        setValue(key ? ((user?.[key] as string | null | undefined) ?? "") : "");
    }

    function finish(justSaved?: { key: ProfileFieldKey; value: string }) {
        const next = step + 1;
        if (next >= total) {
            const merged = justSaved ? { ...(user ?? {}), [justSaved.key]: justSaved.value } : (user ?? {});
            if (computeProfileCompleteness(merged as Parameters<typeof computeProfileCompleteness>[0]).isComplete) {
                setCelebrate(true);
                finishTimerRef.current = setTimeout(onFinish, 1500);
            } else {
                onFinish();
            }
            return;
        }
        loadValueFor(next);
        setStep(next);
    }

    async function advance(save: boolean) {
        if (!save) {
            setErrorMsg(null);
            finish();
            return;
        }
        const v = value.trim();
        if (v) {
            setSaving(true);
            const { error } = await authClient.updateUser({
                [field.key]: v,
            } as Parameters<typeof authClient.updateUser>[0]);
            setSaving(false);
            if (error) {
                setErrorMsg(t("myProfile.saveError"));
                return;
            }
            setErrorMsg(null);
            await refreshUser();
            finish({ key: field.key, value: v });
            return;
        } else {
            setErrorMsg(null);
        }
        finish();
    }

    return (
        <div className="mx-auto max-w-md">
            <ConfettiBurst fire={celebrate} />

            {/* Progress */}
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400">
                {t("myProfile.wizard.stepOf", { step: step + 1, total })}
            </p>

            <div className="min-h-40 rounded-sm border border-gray-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center gap-2">
                    <Icon icon={field.icon} className="size-6 text-purple-600 dark:text-purple-400" aria-hidden />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t(`myProfile.field.${field.key}.question`)}
                    </h2>
                </div>
                <Input
                    autoFocus
                    size="lg"
                    placeholder={t(`myProfile.field.${field.key}.placeholder`)}
                    value={value}
                    onValueChange={setValue}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") advance(true);
                    }}
                    classNames={{ inputWrapper: "bg-gray-50 dark:bg-slate-900" }}
                />
                {errorMsg ? (
                    <p className="mt-2 text-xs text-red-500">{errorMsg}</p>
                ) : (
                    t.has(`myProfile.field.${field.key}.why`) && (
                        <p className="mt-2 text-xs text-gray-400">{t(`myProfile.field.${field.key}.why`)}</p>
                    )
                )}
            </div>

            <div className="mt-4 flex items-center justify-between">
                <Button variant="light" size="sm" onPress={() => advance(false)} isDisabled={saving}>
                    {t("myProfile.wizard.skip")}
                </Button>
                <Button
                    variant="bordered"
                    className="font-semibold"
                    size="md"
                    onPress={() => advance(true)}
                    isLoading={saving}
                    endContent={
                        step + 1 >= total ? undefined : (
                            <Icon icon="lucide:arrow-right" className="size-4" aria-hidden />
                        )
                    }
                >
                    {step + 1 >= total ? t("myProfile.wizard.finish") : t("myProfile.wizard.next")}
                </Button>
            </div>
        </div>
    );
}
