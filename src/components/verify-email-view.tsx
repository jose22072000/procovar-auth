"use client";

import { Button, Card, CardBody, CardHeader, Link } from "@heroui/react";
import { Icons } from "./icons/iconify";

export function VerifyEmailView() {
    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <Card className="w-full overflow-hidden rounded-2xl bg-content1 dark:bg-content1">
                <div className="relative bg-gradient-to-b from-[#7551FF] via-[#5e41d1] to-[#3311DB]">
                    <div className="flex gap-2 pt-8 pb-20 justify-center items-center">
                        <span aria-label="mail" role="img" className="text-4xl">
                            📧
                        </span>
                        <h1 className="text-4xl font-medium text-white font-sans">Check Email</h1>
                    </div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <div className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-content1 bg-primary text-white">
                             <Icons.mailOutline className="size-12" />
                        </div>
                    </div>
                </div>
                <CardBody className="pt-14 items-center pb-8">
                    <h2 className="text-2xl font-bold text-center">Verify your email</h2>
                    <p className="text-medium text-center mt-2 text-default-500">
                        We've sent a verification link to your email address. Please check your inbox to activate your account.
                    </p>

                    <div className="w-full mt-8 flex flex-col gap-2">
                        <Button
                            as={Link}
                            href="/"
                            className="w-full font-semibold"
                            color="primary"
                            variant="solid"
                        >
                            Return to Sign In
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
