"use client";

import { Avatar, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface OrgHeaderProps {
    orgName: string;
    orgLogo: string | null;
    orgSlug: string;
    memberRole: string;
    userName: string;
    userImage: string | null;
}

type RoleBadge = {
    label: string;
    color: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
};

function useRoleBadge(role: string): RoleBadge {
    const t = useTranslations();
    const map: Record<string, RoleBadge> = {
        owner: { label: t('orgView.roleOwner'), color: "primary" },
        admin: { label: t('orgView.roleAdmin'), color: "secondary" },
        staff: { label: t('orgView.roleStaff'), color: "default" },
        agent: { label: t('orgView.roleAgent'), color: "warning" },
    };
    return map[role] ?? map["agent"];
}

export function OrgHeader({ orgName, orgLogo, orgSlug, memberRole, userName, userImage }: OrgHeaderProps) {
    const t = useTranslations();
    const router = useRouter();
    const badge = useRoleBadge(memberRole);

    return (
        <div className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm p-4 md:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Avatar
                        src={orgLogo ?? undefined}
                        name={orgName[0]?.toUpperCase()}
                        className="w-14 h-14 text-lg border-4 border-blue-100 dark:border-slate-700"
                        color="primary"
                        imgProps={{ referrerPolicy: "no-referrer" }}
                    />
                    <div>
                        <h2 className="text-xl font-bold text-black dark:text-white">{orgName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">@{orgSlug}</span>
                            <Chip size="sm" radius="sm" variant="flat" color={badge.color}>
                                {badge.label}
                            </Chip>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="bordered"
                        size="sm"
                        className="font-semibold border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35"
                        startContent={<Icons.user className="size-4" />}
                        onPress={() => router.push("/profile?view=client")}
                    >
                        {t('orgView.viewAsClient')}
                    </Button>
                    <Button
                        variant="bordered"
                        size="sm"
                        isIconOnly
                        className="border-[#0A2252]/85 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8 dark:text-white dark:border-white/35"
                        title={t('myProfile.title')}
                        onPress={() => router.push("/profile/me")}
                    >
                        <Icons.userCircle className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
