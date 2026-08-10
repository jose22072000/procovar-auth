"use client";

import React from "react";
import { Button, Input, Link, Divider, Alert, addToast } from "@heroui/react";
import { Icons } from "../icons/iconify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp } from "@/server/auth.server";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address format"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type SignUpSchema = z.infer<typeof signUpSchema>;

export function SignUpForm() {
    const router = useRouter();
    const t = useTranslations();
    const [isVisible, setIsVisible] = React.useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = React.useState(false);

    const toggleVisibility = () => setIsVisible(!isVisible);
    const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        reset,
    } = useForm<SignUpSchema>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
        mode: "all",
    });

    const onFieldChange = () => {
        if (errors.root) {
            clearErrors("root");
        }
    };

    const onSubmit = async (data: SignUpSchema) => {
        const response = await signUp(data.name, data.email, data.password);
        const hasError = response.errors && Object.keys(response.errors).length > 0;
        if (response.toast) {
            addToast({
                title: response.toast.title,
                description: response.toast.description,
                color: hasError ? "danger" : "success",
            });
        }
        if (response.errors) {
            if (response.errors.root) {
                setError("root", { message: response.errors.root as string });
            }
        }
        if (!hasError) {
            reset();
            router.refresh();
            // Redirect URL is consumed and returned by the signUp server action
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
            <div className="flex items-center gap-2 pb-10">
                <span aria-label="rocket" role="img">
                    <Icons.userPlus className="!size-10" />
                </span>
                <h1 className="text-4xl font-medium">{t('auth.signUp')}</h1>
            </div>
            <div className="flex flex-col items-center pb-6">
                <p className="text-xl font-medium">{t('auth.createAccount')}</p>
                <p className="text-small ">{t('auth.joinUsToGetStarted')}</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    className="w-full font-semibold border-[#0A2252]/70 text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                    startContent={<Icons.google className="!size-6" />}
                    variant="bordered"
                    size="lg"
                    onPress={handleGoogleSignIn}
                >
                    {t('auth.signUpWithGoogle')}
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
                    startContent={<Icons.userCircle className="!size-4" />}
                    label={t('auth.fullName')}
                    type="text"
                    variant="bordered"
                    autoComplete="name"
                    isInvalid={!!errors.name}
                    errorMessage={errors.name?.message}
                    {...register("name", { onChange: onFieldChange })}
                />
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
                    autoComplete="new-password"
                    type={isVisible ? "text" : "password"}
                    variant="bordered"
                    isInvalid={!!errors.password}
                    errorMessage={errors.password?.message}
                    {...register("password", { onChange: onFieldChange })}
                />
                <Input
                    isRequired
                    startContent={<Icons.keyMinimalistic className="!size-4" />}
                    endContent={
                        <button type="button" onClick={toggleConfirmVisibility} className="cursor-pointer">
                            {isConfirmVisible ? (
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
                    label={t('auth.confirmPassword')}
                    autoComplete="new-password"
                    type={isConfirmVisible ? "text" : "password"}
                    variant="bordered"
                    isInvalid={!!errors.confirmPassword}
                    errorMessage={errors.confirmPassword?.message}
                    {...register("confirmPassword", { onChange: onFieldChange })}
                />

                {errors.root && <Alert color="danger" title={errors.root.message} />}
                <Button
                    className="w-full font-semibold border-[#0A2252] text-[#0A2252] bg-transparent hover:bg-[#0A2252]/8"
                    variant="bordered"
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    startContent={!isSubmitting && <Icons.shieldKey className="!size-6" />}
                >
                    {t('auth.signUp')}
                </Button>
            </form>
            <p className="text-small text-center">
                {t('auth.alreadyHaveAccount')}&nbsp;
                <Link href="/" size="sm" className="text-primary-700 underline underline-offset-4">
                    {t('auth.signIn')}
                </Link>
            </p>
        </div>
    );
}
