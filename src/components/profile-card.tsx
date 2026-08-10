"use client";

import { Card, CardBody, CardHeader, Avatar, Divider, Button, Chip, Spinner, Skeleton } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { useState, useEffect } from "react";
import { Icons } from "./icons/iconify";
import { useFullUser } from "./full-user-provider";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Main profile content using the provider
export function ProfileContent() {
    const t = useTranslations();
    const { user, isLoading, error, organizations, linkedProviders } = useFullUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="flex gap-4 p-6">
                    <Skeleton className="w-20 h-20 rounded-sm" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40 rounded-sm" />
                        <Skeleton className="h-4 w-32 rounded-sm" />
                    </div>
                </CardHeader>
                <Divider />
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i}>
                                <Skeleton className="h-4 w-20 rounded-sm mb-2" />
                                <Skeleton className="h-5 w-32 rounded-sm" />
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardBody className="p-6 text-center">
                    <p className="text-danger">{t("common.profileCard.errorLoadingProfile", { error })}</p>
                </CardBody>
            </Card>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-6">
            <ProfileCard user={user} />
            <OrganizationsCard organizations={organizations} />
            <LinkedAccountsCard providers={linkedProviders} />
        </div>
    );
}

// Profile Card Component
interface ProfileCardProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        emailVerified: boolean;
        isSystemAdmin?: boolean;
        createdAt: string;
    };
}

export function ProfileCard({ user }: ProfileCardProps) {
    const t = useTranslations();
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResendVerification = async () => {
        if (resendCooldown > 0) return;
        
        setIsResending(true);
        try {
            await authClient.sendVerificationEmail({
                email: user.email,
                callbackURL: "/profile",
            });
            setResendCooldown(60);
        } catch (error) {
            console.error("Failed to resend verification email:", error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex gap-4 p-6">
                <Avatar 
                    src={user.image || undefined} 
                    name={user.name} 
                    className="w-20 h-20 text-2xl bg-primary/10 text-white"
                />
                <div>
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    <p className="text-gray-500">{user.email}</p>
                </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">{t("common.profileCard.userIdLabel")}</label>
                        <p className="mt-1 font-mono text-sm">{user.id}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">{t("common.profileCard.roleLabel")}</label>
                        <p className="mt-1">{user.isSystemAdmin ? t("common.profileCard.roleSystemAdmin") : t("common.profileCard.roleUser")}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">{t("common.profileCard.emailStatusLabel")}</label>
                        <div className="mt-1 flex items-center gap-2">
                            {user.emailVerified ? (
                                <Chip radius="sm" color="success" variant="flat" size="sm" startContent={<Icons.dialogCheck className="w-3 h-3" />}>
                                    {t("common.profileCard.verified")}
                                </Chip>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <Chip radius="sm" color="warning" variant="flat" size="sm">
                                        {t("common.profileCard.notVerified")}
                                    </Chip>
                                    <Button
                                        size="sm"
                                        color="primary"
                                        variant="bordered"
                                        onPress={handleResendVerification}
                                        isLoading={isResending}
                                        isDisabled={resendCooldown > 0}
                                        startContent={!isResending && <Icons.mailOutline className="w-4 h-4" />}
                                    >
                                        {resendCooldown > 0
                                            ? t("common.profileCard.resendIn", { seconds: resendCooldown })
                                            : t("common.profileCard.resendVerification")
                                        }
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">{t("common.profileCard.memberSince")}</label>
                        <p className="mt-1">{new Date(user.createdAt).toDateString()}</p>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

// Organizations Card Component
interface OrganizationsCardProps {
    organizations: Array<{
        id: string;
        role: string;
        organizationId: string;
        organization: {
            id: string;
            name: string;
            slug: string;
            logo: string | null;
        };
    }>;
}

function OrganizationsCard({ organizations }: OrganizationsCardProps) {
    const t = useTranslations();
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner': return 'primary';
            case 'admin': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <Card>
            <CardHeader className="p-6">
                <div className="flex items-center gap-2">
                    <Icons.building className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">{t("common.profileCard.organizationsTitle")}</h3>
                </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-6">
                {organizations.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                        {t("common.profileCard.noOrganizations")}
                    </p>
                ) : (
                    <div className="space-y-4">
                        {organizations.map((membership) => (
                            <div 
                                key={membership.id} 
                                className="flex items-center justify-between p-4 rounded-sm bg-default-100"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar 
                                        src={membership.organization.logo || undefined}
                                        name={membership.organization.name}
                                        size="sm"
                                    />
                                    <div>
                                        <p className="font-medium">{membership.organization.name}</p>
                                        <p className="text-sm text-gray-500">@{membership.organization.slug}</p>
                                    </div>
                                </div>
                                <Chip radius="sm" 
                                    color={getRoleColor(membership.role)} 
                                    variant="flat" 
                                    size="sm"
                                >
                                    {membership.role}
                                </Chip>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}

// Linked Accounts Card Component
interface LinkedAccountsCardProps {
    providers: string[];
}

function LinkedAccountsCard({ providers }: LinkedAccountsCardProps) {
    const t = useTranslations();
    const getProviderIcon = (providerId: string) => {
        switch (providerId) {
            case 'google': return <Icons.google className="w-5 h-5" />;
            case 'github': return <Icons.github className="w-5 h-5" />;
            case 'credential': return <Icons.key className="w-5 h-5" />;
            default: return <Icons.link className="w-5 h-5" />;
        }
    };

    const getProviderName = (providerId: string) => {
        switch (providerId) {
            case 'google': return t("common.profileCard.providerGoogle");
            case 'github': return t("common.profileCard.providerGithub");
            case 'credential': return t("common.profileCard.providerCredential");
            default: return providerId;
        }
    };

    return (
        <Card>
            <CardHeader className="p-6">
                <div className="flex items-center gap-2">
                    <Icons.link className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">{t("common.profileCard.linkedAccountsTitle")}</h3>
                </div>
            </CardHeader>
            <Divider />
            <CardBody className="p-6">
                {providers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                        {t("common.profileCard.noLinkedAccounts")}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {providers.map((providerId) => (
                            <Chip radius="sm" 
                                key={providerId}
                                variant="flat"
                                startContent={getProviderIcon(providerId)}
                            >
                                {getProviderName(providerId)}
                            </Chip>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
