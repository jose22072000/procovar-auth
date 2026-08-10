"use client";

import { useTranslations } from "next-intl";

export function ProfileProgressRing({
    percent,
    size = 64,
    children,
}: {
    percent: number;
    size?: number;
    children?: React.ReactNode;
}) {
    const t = useTranslations();
    const clamped = Math.max(0, Math.min(100, percent));
    return (
        <div
            className="relative shrink-0 rounded-full"
            style={{
                width: size,
                height: size,
                background: `conic-gradient(#7c3aed ${clamped * 3.6}deg, rgb(229 231 235) 0deg)`,
            }}
            role="img"
            aria-label={t("myProfile.progressRing.ariaLabel", { percent: clamped })}
        >
            <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-white dark:bg-slate-900">
                {children ?? (
                    <span className="text-xs font-bold text-[#4c1d95] dark:text-purple-300">{clamped}%</span>
                )}
            </div>
        </div>
    );
}
