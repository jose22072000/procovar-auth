"use client";

import React from "react";
import { Button, Input, Link, Alert, addToast } from "@heroui/react";
import { Icons } from "../icons/iconify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPassword } from "@/server/auth.server";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm() {
    const t = useTranslations();

    const forgotPasswordSchema = z.object({
        email: z.string().email(t("auth.emailInvalidFormat")),
    });

    type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
        clearErrors,
        reset,
    } = useForm<ForgotPasswordSchema>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onFieldChange = () => {
        if (errors.root) {
            clearErrors("root");
        }
    };

    const onSubmit = async (data: ForgotPasswordSchema) => {
        const response = await forgotPassword(data.email);
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
        }
    };

    return (
        <div className="flex w-full max-w-sm flex-col gap-4">
            <div className="flex items-center gap-2 pb-10">
                <span aria-label={t("auth.lockIconLabel")} role="img">
                    <Icons.keyMinimalistic className="!size-10" />
                </span>
                <h1 className="text-4xl font-medium">{t("auth.forgotPasswordTitle")}</h1>
            </div>
            <div className="flex flex-col items-center pb-6">
                <p className="text-xl font-medium">{t("auth.resetYourPasswordSubtitle")}</p>
                <p className="text-small text-center">{t("auth.forgotPasswordHint")}</p>
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    isRequired
                    autoComplete="username"
                    startContent={<Icons.mailOutline className="!size-4" />}
                    label={t("auth.emailAddress")}
                    type="email"
                    variant="bordered"
                    isInvalid={!!errors.email}
                    errorMessage={errors.email?.message}
                    {...register("email", { onChange: onFieldChange })}
                />

                {errors.root && <Alert color="danger" title={errors.root.message} />}
                
                <Button
                    className="w-full font-semibold"
                    variant="bordered"
                    color="primary"
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    startContent={!isSubmitting && <Icons.mailOutline className="!size-6" />}
                >
                    {t("auth.sendResetLinkButton")}
                </Button>
            </form>
            <p className="text-small text-center">
                {t("auth.rememberYourPassword")}&nbsp;
                <Link href="/" size="sm" className="text-primary-700 underline underline-offset-4">
                    {t("auth.signIn")}
                </Link>
            </p>
        </div>
    );
}
