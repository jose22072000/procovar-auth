"use client";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons/iconify";
import { SectionCard, outlinedButtonClass } from "./section-card";

/**
 * Payment methods. Card-on-file is NOT implemented: saving a card requires
 * gateway tokenization (Redsys COF / a SumUp vault) plus a stored-token model in
 * qb-back — none of which exist yet, and the card number must never touch our DB.
 * The "Añadir tarjeta" affordance is therefore disabled until a gateway is wired.
 */
export function PaymentMethodsSection({
    isOrgUser,
    bookingUrl,
    panelUrl,
}: {
    isOrgUser: boolean;
    bookingUrl: string;
    panelUrl: string;
}) {
    const t = useTranslations();
    return (
        <SectionCard
            icon={<Icons.creditCard className="size-5 text-blue-600 dark:text-blue-400" />}
            title={t("myProfile.payment.title")}
        >
            {isOrgUser ? (
                <>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("myProfile.payment.ownerDescription")}
                    </p>
                    <Button
                        as="a"
                        href={panelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="bordered"
                        className={outlinedButtonClass}
                        startContent={<Icons.building className="size-4" />}
                    >
                        {t("myProfile.payment.goToOwnerPanel")}
                    </Button>
                </>
            ) : (
                <>
                    {/* Saved cards placeholder — nothing to list until a gateway vault exists. */}
                    <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-gray-300 bg-white px-4 py-6 text-center dark:border-slate-600 dark:bg-slate-900">
                        <Icon icon="lucide:credit-card" className="size-7 text-gray-300 dark:text-slate-600" aria-hidden />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t("myProfile.payment.noCardsTitle")}
                        </p>
                        <p className="max-w-sm text-xs text-gray-400">
                            {t("myProfile.payment.noCardsDescription")}
                        </p>
                        <Button
                            size="sm"
                            variant="bordered"
                            className={outlinedButtonClass}
                            isDisabled
                            startContent={<Icons.plus className="size-4" />}
                        >
                            {t("myProfile.payment.addCard")}
                        </Button>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                            {t("myProfile.payment.comingSoon")}
                        </span>
                    </div>

                    <Button
                        as="a"
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="bordered"
                        className={outlinedButtonClass}
                        startContent={<Icons.reservation className="size-4" />}
                    >
                        {t("myProfile.payment.exploreStays")}
                    </Button>
                </>
            )}

            <div className="flex items-center gap-2 rounded-sm border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                <Icons.shieldKey className="size-4 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isOrgUser
                        ? t("myProfile.payment.secureOwnerNote")
                        : t("myProfile.payment.secureClientNote")}
                </p>
            </div>
        </SectionCard>
    );
}
