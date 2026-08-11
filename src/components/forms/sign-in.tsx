"use client";

import React from "react";
import { Button, Input, Checkbox, Link, addToast } from "@heroui/react";
import { Icons } from "../icons/iconify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "@/server/auth.server";
import { useTranslations } from "next-intl";

/**
 * Lo que se comprueba ANTES de mandar el formulario.
 *
 * Solo que haya algo. Aquí se comprueba una contraseña que YA existe, no se está
 * eligiendo una: exigirle mayúsculas, números y símbolos deja fuera a quien la
 * tenga puesta por un administrador y no cumpla esas reglas — y el formulario ni
 * siquiera llega a enviarse, así que la persona ve un error sobre su contraseña
 * sin haber intentado entrar. Las reglas de fortaleza van donde se ELIGE la
 * contraseña, no donde se usa.
 */
const signInSchema = z.object({
    // Nombre de usuario O correo: en PEDIDO la gente entra con `yasmani` o
    // `claudia.hab` y muchos no tienen correo. Exigir aquí formato de correo
    // dejaría fuera a la mitad de la casa antes de llegar al servidor.
    email: z.string().min(1, "Escribe tu usuario o tu correo."),
    password: z.string().min(1, "Escribe tu contraseña."),
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
    });

    const onFieldChange = () => clearErrors("root");

    const onSubmit = async (data: SignInSchema) => {
        const response = await signIn(data.email, data.password, data.remember ?? false);
        const hasError = !!response.errors;

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
            });
        }

        if (!hasError) {
            const redirectUrl =
                (response.data as { redirectUrl?: string } | undefined)?.redirectUrl || "/profile";
            window.location.assign(redirectUrl);
        }
    };

    return (
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
                isRequired
                autoComplete="username"
                label={t("auth.userOrEmail")}
                labelPlacement="outside"
                placeholder={t("auth.userOrEmailPlaceholder")}
                type="text"
                variant="bordered"
                radius="none"
                size="lg"
                startContent={<Icons.mailOutline className="!size-4 text-pv-tinta-suave" />}
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
                {...register("email", { onChange: onFieldChange })}
            />

            <Input
                isRequired
                label={t("auth.password")}
                labelPlacement="outside"
                placeholder="••••••••"
                autoComplete="current-password"
                type={isVisible ? "text" : "password"}
                variant="bordered"
                radius="none"
                size="lg"
                startContent={<Icons.keyMinimalistic className="!size-4 text-pv-tinta-suave" />}
                endContent={
                    <button
                        type="button"
                        onClick={toggleVisibility}
                        className="cursor-pointer text-pv-tinta-suave"
                        aria-label={isVisible ? t("auth.hidePassword") : t("auth.showPassword")}
                    >
                        {isVisible ? (
                            <Icons.eyeClosed className="pointer-events-none text-xl" />
                        ) : (
                            <Icons.eye className="pointer-events-none text-xl" />
                        )}
                    </button>
                }
                isInvalid={!!errors.password}
                errorMessage={errors.password?.message}
                {...register("password", { onChange: onFieldChange })}
            />

            <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <Checkbox size="sm" radius="none" {...register("remember")}>
                    {t("auth.rememberMe")}
                </Checkbox>
                <Link
                    className="text-sm text-pv-azul underline underline-offset-4"
                    href="/forgot-password"
                >
                    {t("auth.forgotPassword")}
                </Link>
            </div>

            {errors.root && (
                <p
                    role="alert"
                    className="border-l-2 border-pv-cuno bg-pv-cuno/5 px-3 py-2.5 text-sm text-pv-cuno"
                >
                    {errors.root.message}
                </p>
            )}

            <Button
                className="pv-toque w-full bg-pv-azul font-semibold text-white data-[hover=true]:bg-pv-azul-hondo"
                radius="none"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
            >
                {t("auth.signIn")}
            </Button>
        </form>
    );
}
