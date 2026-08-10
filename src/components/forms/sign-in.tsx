"use client";

import React from "react";
import { Button, Input, Checkbox, Link, Divider, Alert, addToast } from "@heroui/react";
import { Icons } from "../icons/iconify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "@/server/auth.server";
import { authClient } from "@/lib/auth-client";
import { useTranslations } from "next-intl";

const signInSchema = z.object({
    email: z.string().email("Invalid email address format"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    remember: z.boolean().optional(),
});

type SignInSchema = z.infer<typeof signInSchema>;

export function SignInForm({ savedEmail }: { savedEmail?: string }) {
    const [isVisible, setIsVisible] = React.useState(false);
    const t = useTranslations();

    const toggleVisibility = () => setIsVisible(!isVisible);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
    } = useForm<SignInSchema>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: savedEmail || "",
            password: "",
            remember: !!savedEmail,
        },
        mode: "all",
    });

    const onFieldChange = () => {
        if (errors.root) {
            clearErrors("root");
        }
    };

    const onSubmit = async (data: SignInSchema) => {
        const response = await signIn(data.email, data.password, !!data.remember);
        const hasError = response.errors && Object.keys(response.errors).length > 0;
        if (response.errors) {
            if (response.errors.root) {
                setError("root", { message: response.errors.root as string });
            }
        }
        if (response.toast) {
            addToast({
                title: response.toast.title,
                description: response.toast.description,
                color: hasError ? "danger" : "success",
            })
        }
        
        if (!hasError) {
            // Redirect URL is consumed and returned by the signIn server action
            const redirectUrl = (response.data as { redirectUrl?: string } | undefined)?.redirectUrl || "/profile";
            window.location.assign(redirectUrl);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/api/auth/callback",
            });
        } catch {
            addToast({
                title: "Error",
                description: "Failed to connect to Google Sign In",
                color: "danger",
            });
        }
    };

    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <div className="flex gap-2 pb-10">
                <span aria-label="waving hand" role="img" className="text-4xl">
                    👋
                </span>
                <h1 className="text-4xl font-medium">{t('auth.signIn')}</h1>
            </div>
            <div className="flex flex-col items-center pb-6">
                <p className="text-xl font-medium">{t('auth.welcomeBack')}</p>
                <p className="text-small ">{t('auth.logInToContinue')}</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    className="w-full font-semibold border-[#0A2252]/70 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                    startContent={<Icons.google className="!size-6" />}
                    variant="bordered"
                    size="lg"
                    onPress={handleGoogleSignIn}
                >
                    {t('auth.continueWithGoogle')}
                </Button>
            </div>
            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny  shrink-0">{t('auth.or')}</p>
                <Divider className="flex-1" />
            </div>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    isRequired
                    autoComplete="username"
                    startContent={<Icons.mailOutline className="!size-4" />}
                    label={t('auth.emailAddress')}
                    type="email"
                    variant="bordered"
                    isInvalid={!!errors.email}
                    errorMessage={errors.email?.message}
                    {...register("email", { onChange: onFieldChange })}
                />
                <Input
                    isRequired
                    startContent={<Icons.keyMinimalistic className="!size-4" />}
                    endContent={
                        <button type="button" onClick={toggleVisibility} className="cursor-pointer">
                            {isVisible ? (
                                <Icons.eyeClosed
                                    className=" pointer-events-none text-2xl"
                                />
                            ) : (
                                <Icons.eye
                                    className=" pointer-events-none text-2xl"
                                />
                            )}
                        </button>
                    }
                    label={t('auth.password')}
                    autoComplete="current-password"
                    type={isVisible ? "text" : "password"}
                    variant="bordered"
                    isInvalid={!!errors.password}
                    errorMessage={errors.password?.message}
                    {...register("password", { onChange: onFieldChange })}
                />
                <div className="flex w-full items-center justify-between px-1 py-2">
                    <Checkbox size="sm" {...register("remember")}>
                        {t('auth.rememberMe')}
                    </Checkbox>
                    <Link className="text-primary-700 underline underline-offset-4" href="/forgot-password" size="sm">
                        {t('auth.forgotPassword')}
                    </Link>
                </div>
                {errors.root && <Alert color="danger" title={errors.root.message} />}
                <Button
                    className="w-full font-semibold border-[#0A2252] text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                    variant="bordered"
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    startContent={!isSubmitting && <Icons.shieldKey className="!size-6" />}
                >
                    {t('auth.signIn')}
                </Button>
            </form>
            <p className="text-small text-center">
                {t('auth.needAccount')}&nbsp;
                <Link href="/sign-up" size="sm" className="text-primary-700 underline underline-offset-4">
                    {t('auth.signUp')}
                </Link>
            </p>
        </div>
    );
}
