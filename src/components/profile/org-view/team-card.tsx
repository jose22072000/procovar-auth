"use client";

import { Card, CardBody, CardHeader, Button, Chip } from "@heroui/react";
import { Icons } from "@/components/icons/iconify";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Member } from "@/components/full-user-provider";

interface TeamCardProps {
    members: Member[];
}

const ROLE_COLORS: Record<string, "default" | "primary" | "secondary" | "warning"> = {
    owner: "primary",
    admin: "secondary",
    staff: "default",
    agent: "warning",
};

export function TeamCard({ members }: TeamCardProps) {
    const t = useTranslations();
    const router = useRouter();

    const ROLE_LABELS: Record<string, string> = {
        owner: t('orgView.roleOwner'),
        admin: t('orgView.roleAdmin'),
        staff: t('orgView.roleStaff'),
        agent: t('orgView.roleAgent'),
    };

    const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
        acc[m.role] = (acc[m.role] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <Card className="bg-white dark:bg-slate-900 shadow-lg shadow-gray-200/50 dark:shadow-none rounded-sm">
            <CardHeader className="flex justify-between items-center p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-sm">
                        <Icons.userPlus className="size-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white">{t('orgView.team')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} {t('orgView.members')}</p>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="light"
                    className="text-blue-600 dark:text-blue-300 font-medium"
                    onPress={() => router.push("/organizations")}
                >
                    {t('cards.viewAll')}
                </Button>
            </CardHeader>
            <CardBody className="pt-2 px-5 pb-5">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(roleCounts).map(([role, count]) => (
                        <div
                            key={role}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800/40 rounded-sm"
                        >
                            <Chip
                                size="sm"
                                radius="sm"
                                variant="flat"
                                color={ROLE_COLORS[role] ?? "default"}
                            >
                                {ROLE_LABELS[role] ?? role}
                            </Chip>
                            <span className="text-sm font-semibold text-black dark:text-white">
                                {count}
                            </span>
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
}
