"use client";

import { Icons } from "@/components/icons/iconify";
import { useTranslations } from "next-intl";

interface OwnerUpgradeCtaProps {
    panelUrl?: string;
}

export function OwnerUpgradeCta({ panelUrl = "https://panel.hostravel.net" }: OwnerUpgradeCtaProps) {
    const t = useTranslations();

    return (
        <div className="bg-gradient-to-r from-[#0A2252]/5 to-violet-50 border border-[#0A2252]/10 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                <div className="p-2.5 bg-[#0A2252]/10 rounded-lg shrink-0 mt-0.5">
                    <Icons.property className="size-5 text-[#0A2252]" />
                </div>
                <div>
                    <p className="font-semibold text-slate-900">{t('clientView.upgradeTitle')}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{t('clientView.upgradeDesc')}</p>
                </div>
            </div>
            <a
                href={panelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A2252] text-white text-sm font-semibold hover:bg-[#0A2252]/90 transition-colors"
            >
                <Icons.plus className="size-4" />
                {t('clientView.startHosting')}
            </a>
        </div>
    );
}
