"use client";

import { Avatar, Button, Card, CardBody, Divider, Link } from "@heroui/react";
import { Icons } from "./icons/iconify";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface User {
    name: string;
    email: string;
    image?: string | null;
}

interface AccountViewProps {
    user: User;
}

export function AccountView({ user }: AccountViewProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.refresh();
    };

    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <Card className="w-full overflow-hidden rounded-2xl bg-content1 dark:bg-content1">
                <div className="relative bg-gradient-to-b from-[#110D5B] to-[#2a257a]">
                    <div className="flex gap-2 pt-8 pb-20 justify-center items-center">
                        <span aria-label="waving hand" role="img" className="text-4xl">
                            👋
                        </span>
                        <h1 className="text-4xl font-medium text-white font-sans">Welcome Back</h1>
                    </div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <Avatar
                            src={user.image || undefined}
                            icon={<Icons.user className="!size-16" />}
                            className="w-24 h-24 text-2xl border-4 border-content1 bg-primary text-white"
                            showFallback
                            imgProps={{
                                referrerPolicy: "no-referrer"
                            }}
                        />
                    </div>
                </div>
                <CardBody className="pt-14 items-center pb-8">
                    <h2 className="text-2xl font-bold text-center">{user.name}</h2>
                    <p className="text-medium  text-center">{user.email}</p>

                    <div className="w-full mt-8">
                        <Button
                            as={Link}
                            href="/profile"
                            color="primary"
                            className="w-full font-semibold"
                            size="lg"
                            endContent={<Icons.userCircle className="size-5" />}
                        >
                            Continue to Profile
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny  shrink-0">OR</p>
                <Divider className="flex-1" />
            </div>

            <p className="text-small text-center">
                Want to switch accounts?&nbsp;
                <Link
                    as="button"
                    onClick={handleSignOut}
                    size="sm"
                    color="danger"
                    className="cursor-pointer"
                >
                    Sign Out
                </Link>
            </p>
        </div>
    );
}
