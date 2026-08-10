"use client";

import { Avatar, Button, Card, CardBody, Divider, Link } from "@heroui/react";
import { Icons } from "./icons/iconify";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import type { ProfileRole } from "@/lib/role-resolver";

interface User {
    name: string;
    email: string;
    image?: string | null;
}

interface AccountViewProps {
    user: User;
    role: ProfileRole;
}

export function AccountView({ user, role }: AccountViewProps) {
    const router = useRouter();
    const t = useTranslations();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.refresh();
    };

    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <Card className="w-full overflow-hidden rounded-sm bg-content1 dark:bg-content1">
                <div className="relative bg-gradient-to-b from-[#110D5B] to-[#2a257a]">
                    <div className="flex gap-2 pt-8 pb-20 justify-center items-center">
                        <span aria-label="waving hand" role="img" className="text-4xl">
                            👋
                        </span>
                        <h1 className="text-4xl font-medium text-white font-sans">{t('account.welcomeBack')}</h1>
                    </div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <Avatar
                            src={user.image || undefined}
                            icon={<Icons.user className="!size-16" />}
                            className="w-24 h-24 text-2xl border-4 border-content1 bg-primary text-white"
                            showFallback
                            imgProps={{ referrerPolicy: "no-referrer" }}
                        />
                    </div>
                </div>
                <CardBody className="pt-14 items-center pb-8">
                    <h2 className="text-2xl font-bold text-center">{user.name}</h2>
                    <p className="text-medium text-center">{user.email}</p>

                    <div className="w-full mt-8 flex flex-col gap-2">
                        {role === "admin" && (
                            <>
                                <Button
                                    as={Link}
                                    href="/dashboard"
                                    variant="bordered"
                                    className="w-full font-semibold border-[#0A2252] text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                                    size="lg"
                                    endContent={<Icons.system className="size-5" />}
                                >
                                    {t('account.goToDashboard')}
                                </Button>
                                {/* Admins can also preview the owner and client views (same user, all 3 roles). */}
                                <Button
                                    as={Link}
                                    href="/profile/org"
                                    variant="light"
                                    className="w-full font-medium text-slate-500 hover:text-[#0A2252]"
                                    size="md"
                                    endContent={<Icons.building className="size-4" />}
                                >
                                    {t('account.orgDashboard')}
                                </Button>
                                <Button
                                    as={Link}
                                    href="/profile?view=client"
                                    variant="light"
                                    className="w-full font-medium text-slate-500 hover:text-[#0A2252]"
                                    size="md"
                                    endContent={<Icons.userCircle className="size-4" />}
                                >
                                    {t('account.myPersonalProfile')}
                                </Button>
                            </>
                        )}

                        {(role === "org-full" || role === "org-restricted") && (
                            <>
                                <Button
                                    as={Link}
                                    href="/profile/org"
                                    variant="bordered"
                                    className="w-full font-semibold border-[#0A2252] text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                                    size="lg"
                                    endContent={<Icons.building className="size-5" />}
                                >
                                    {t('account.orgDashboard')}
                                </Button>
                                <Button
                                    as={Link}
                                    href="/profile?view=client"
                                    variant="light"
                                    className="w-full font-medium text-slate-500 hover:text-[#0A2252]"
                                    size="md"
                                    endContent={<Icons.userCircle className="size-4" />}
                                >
                                    {t('account.myPersonalProfile')}
                                </Button>
                            </>
                        )}

                        {role === "client" && (
                            <Button
                                as={Link}
                                href="/profile"
                                variant="bordered"
                                className="w-full font-semibold border-[#0A2252] text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                                size="lg"
                                endContent={<Icons.userCircle className="size-5" />}
                            >
                                {t('account.continueToProfile')}
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny shrink-0">{t('auth.or')}</p>
                <Divider className="flex-1" />
            </div>

            <p className="text-small text-center">
                {t('account.wantToSwitchAccounts')}&nbsp;
                <Link
                    as="button"
                    onClick={handleSignOut}
                    size="sm"
                    color="danger"
                    className="cursor-pointer"
                >
                    {t('account.signOut')}
                </Link>
            </p>
        </div>
    );
}
