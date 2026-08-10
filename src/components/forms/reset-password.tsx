"use client";

import React from "react";
import { Button, Input, Link, Alert, addToast } from "@heroui/react";
import { Icons } from "../icons/iconify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPassword } from "@/server/auth.server";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function ResetPasswordForm() {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const resetPasswordSchema = z.object({
        password: z
            .string()
            .min(8, t("auth.passwordMinLength"))
            .regex(/[A-Z]/, t("auth.passwordUppercase"))
            .regex(/[a-z]/, t("auth.passwordLowercase"))
            .regex(/[0-9]/, t("auth.passwordNumber"))
            .regex(/[^A-Za-z0-9]/, t("auth.passwordSpecialChar")),
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t("auth.passwordsDoNotMatch"),
        path: ["confirmPassword"],
    });

    type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

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
    } = useForm<ResetPasswordSchema>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onFieldChange = () => {
        if (errors.root) {
            clearErrors("root");
        }
    };

    const onSubmit = async (data: ResetPasswordSchema) => {
        if (!token) {
            setError("root", { message: t("auth.invalidOrMissingToken") });
            return;
        }

        const response = await resetPassword(data.password, token);
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
            router.push("/?reset=success");
        }
    };

    if (!token) {
        return (
             <div className="flex w-full max-w-sm flex-col gap-4">
                <Alert color="danger" title={t("auth.invalidLinkTitle")} description={t("auth.invalidLinkDescription")} />
                <Button as={Link} href="/" variant="bordered" color="primary" startContent={<Icons.arrowLeft className="size-4" />}>{t("auth.returnToSignIn")}</Button>
             </div>
        )
    }

    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <div className="flex items-center gap-2 pb-10">
                <span aria-label={t("auth.lockIconLabel")} role="img">
                    <Icons.keyMinimalistic className="!size-10" />
                </span>
                <h1 className="text-4xl font-medium">{t("auth.resetPasswordTitle")}</h1>
            </div>
            <div className="flex flex-col items-center pb-6">
                <p className="text-xl font-medium">{t("auth.setNewPassword")}</p>
                <p className="text-small text-center">{t("auth.setNewPasswordHint")}</p>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
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
                    label={t("auth.newPasswordLabel")}
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
                    label={t("auth.confirmNewPasswordLabel")}
                    autoComplete="new-password"
                    type={isConfirmVisible ? "text" : "password"}
                    variant="bordered"
                    isInvalid={!!errors.confirmPassword}
                    errorMessage={errors.confirmPassword?.message}
                    {...register("confirmPassword", { onChange: onFieldChange })}
                />

                {errors.root && <Alert color="danger" title={errors.root.message} />}
                
                <Button
                    className="w-full font-semibold"
                    variant="bordered"
                    color="primary"
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    startContent={!isSubmitting && <Icons.shieldKey className="!size-6" />}
                >
                    {t("auth.resetPasswordButton")}
                </Button>
            </form>
        </div>
    );
}
