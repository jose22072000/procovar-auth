"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
    Link,
    DropdownItem,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    Avatar,
    Button,
    DropdownSection,
    cn,
    Skeleton,
} from "@heroui/react";
import NextLink from "next/link";
import { LogoutModal } from "./LogoutModal";
import { useLogoutModalContext } from "./LogoutModalProvider";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components/icons/iconify";
import { useTranslations } from "next-intl";

type SubscriptionPlanKey = "basic" | "pro" | "pro_plus";

type Subscription = {
    plan: {
        key: SubscriptionPlanKey;
        name: string;
    };
};

const PLAN_AVATAR_STYLE: Record<SubscriptionPlanKey, { glow: string; ring: string; icon: string }> = {
    basic: {
        glow: "shadow-[0_0_10px_2px_rgba(161,161,170,0.5)]",
        ring: "ring-2 ring-zinc-300",
        icon: "lucide:shield",
    },
    pro: {
        glow: "shadow-[0_0_12px_3px_rgba(99,102,241,0.5)]",
        ring: "ring-2 ring-indigo-400",
        icon: "lucide:crown",
    },
    pro_plus: {
        glow: "shadow-[0_0_14px_4px_rgba(168,85,247,0.55)]",
        ring: "ring-2 ring-purple-400",
        icon: "lucide:gem",
    },
};

export const UserNavbarBasic = () => {
    const { data: session, isPending } = authClient.useSession();
        const isAdmin = !!(session?.user as { isSystemAdmin?: boolean } | undefined)?.isSystemAdmin;
    const { openModal } = useLogoutModalContext();
    const t = useTranslations();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const iconClasses = "!size-5 text-default-500 pointer-events-none shrink-0";

    useEffect(() => {
        let isMounted = true;

        async function loadSubscription() {
            if (!session?.user?.id) {
                if (isMounted) setSubscription(null);
                return;
            }

            try {
                const res = await fetch(`/api/subscriptions?userId=${encodeURIComponent(session.user.id)}`, {
                    credentials: "include",
                });
                if (!res.ok) return;

                const data = await res.json();
                const active = (data?.subscriptions ?? []).find((s: { status?: string }) => s.status === "ACTIVE") ?? null;

                if (isMounted) {
                    setSubscription(active);
                }
            } catch {
                // Non-blocking: avatar still renders without plan decorations.
            }
        }

        loadSubscription();

        return () => {
            isMounted = false;
        };
    }, [session?.user?.id]);

    const planStyle = subscription ? PLAN_AVATAR_STYLE[subscription.plan.key] : null;

    if (isPending) {
        return <Skeleton className="flex rounded-sm w-8 h-8" />;
    }

    return (
        <>
            {session?.user ? (
                <Dropdown placement="bottom-end" shouldBlockScroll={false}>
                    <DropdownTrigger>
                        <button
                            className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                            aria-label={t('nav.userMenu')}
                        >
                            {planStyle && (
                                <span
                                    className={cn(
                                        "absolute -inset-1 rounded-full animate-pulse opacity-60",
                                        subscription?.plan.key === "pro_plus"
                                            ? "bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500"
                                            : subscription?.plan.key === "pro"
                                              ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500"
                                              : "bg-gradient-to-br from-zinc-400 to-zinc-500",
                                    )}
                                    aria-hidden
                                />
                            )}

                            <Avatar
                                isBordered={!planStyle}
                                as="span"
                                className={cn(
                                    "relative transition-transform !bg-white !text-primary cursor-pointer hover:scale-110",
                                    planStyle ? cn(planStyle.ring, planStyle.glow) : "ring-white/60",
                                )}
                                color={planStyle ? undefined : "primary"}
                                size="sm"
                                name={session?.user?.name ?? undefined}
                                src={session?.user?.image || undefined}
                                imgProps={{ referrerPolicy: "no-referrer" }}
                            />

                            {planStyle && (
                                <span
                                    className={cn(
                                        "absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-[#0A2252]",
                                        subscription?.plan.key === "pro_plus"
                                            ? "bg-gradient-to-br from-purple-500 to-fuchsia-500"
                                            : subscription?.plan.key === "pro"
                                              ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                                              : "bg-zinc-400",
                                    )}
                                    aria-hidden
                                >
                                    <Icon icon={planStyle.icon} width={10} className="text-white" aria-hidden />
                                </span>
                            )}
                        </button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="User menu" variant="flat">
                        <DropdownSection showDivider className={subscription && planStyle ? undefined : "hidden"}>
                            <DropdownItem
                                key="plan"
                                isReadOnly
                                className="cursor-default opacity-100 data-[hover=true]:bg-transparent"
                                startContent={
                                    <span
                                        className={cn(
                                            "flex size-5 shrink-0 items-center justify-center rounded-full",
                                            subscription?.plan.key === "pro_plus"
                                                ? "bg-gradient-to-br from-purple-500 to-fuchsia-500"
                                                : subscription?.plan.key === "pro"
                                                  ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                                                  : "bg-zinc-400",
                                        )}
                                    >
                                        <Icon icon={planStyle?.icon ?? "lucide:gem"} width={12} className="text-white" aria-hidden />
                                    </span>
                                }
                            >
                                <span className="text-xs font-semibold text-default-600">{subscription?.plan.name}</span>
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection showDivider className={isAdmin ? "hidden" : undefined}>
                            <DropdownItem key="profile" startContent={<Icons.userCircle className={iconClasses} />} as={NextLink} href="/profile">
                                {t('nav.profile')}
                            </DropdownItem>
                            <DropdownItem key="notifications" startContent={<Icons.bell className={iconClasses} />} as={NextLink} href="/profile/notifications">
                                {t('nav.notifications')}
                            </DropdownItem>
                            <DropdownItem key="config" startContent={<Icons.userCircle className={iconClasses} />} as={NextLink} href="/profile/me">
                                {t('nav.settings')}
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection showDivider aria-label="Admin" className={isAdmin ? undefined : "hidden"}>
                            <DropdownItem key="admin-dashboard" startContent={<Icons.system className={iconClasses} />} as={NextLink} href="/dashboard">
                                {t('account.goToDashboard')}
                            </DropdownItem>
                            <DropdownItem key="admin-org" startContent={<Icons.building className={iconClasses} />} as={NextLink} href="/profile/org">
                                {t('account.orgDashboard')}
                            </DropdownItem>
                            <DropdownItem key="admin-client" startContent={<Icons.userCircle className={iconClasses} />} as={NextLink} href="/profile?view=client">
                                {t('account.myPersonalProfile')}
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection showDivider className={isAdmin ? "hidden" : undefined}>
                            <DropdownItem key="invoices" startContent={<Icons.moneyBill className={iconClasses} />} as={NextLink} href="/profile/invoices">
                                {t('nav.invoices')}
                            </DropdownItem>
                            <DropdownItem key="reservations" startContent={<Icons.reservation className={iconClasses} />} as={NextLink} href="/profile/reservations">
                                {t('nav.reservations')}
                            </DropdownItem>
                            <DropdownItem key="services" startContent={<Icons.service className={iconClasses} />} as={NextLink} href="/profile/services">
                                {t('nav.services')}
                            </DropdownItem>
                            <DropdownItem key="vouchers" startContent={<Icons.voucher className={iconClasses} />} as={NextLink} href="/profile/vouchers">
                                {t('nav.vouchers')}
                            </DropdownItem>
                        </DropdownSection>
                        <DropdownSection>
                            <DropdownItem
                                key="logout"
                                className="text-danger"
                                color="danger"
                                startContent={<Icons.powerOff className={cn(iconClasses, "text-danger")} />}
                                onPress={() => { openModal(); }}
                            >
                                <span className="font-semibold">{t('nav.logOut')}</span>
                            </DropdownItem>
                        </DropdownSection>
                    </DropdownMenu>
                </Dropdown>
            ) : (
                <Button
                    endContent={<Icons.started className="!size-6 text-yellow-200" />}
                    as={Link}
                    href="/sign-up"
                    variant="bordered"
                    className="h-10 min-w-[132px] font-semibold rounded-sm text-white border-[#0A2252]/80 bg-transparent hover:bg-[#0A2252]/10"
                >
                    {t('auth.getStarted')}
                </Button>
            )}
            <LogoutModal />
        </>
    );
};
