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
            router.push("/verify-email");
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "/profile",
            });
        } catch (error) {
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
                <h1 className="text-4xl font-medium">Sign Up</h1>
            </div>
            <div className="flex flex-col items-center pb-6">
                <p className="text-xl font-medium">Create an Account</p>
                <p className="text-small ">Join us to get started</p>
            </div>
            <div className="flex flex-col gap-2">
                <Button
                    className="w-full font-semibold"
                    startContent={<Icons.google className="!size-6" />}
                    variant="bordered"
                    size="lg"
                    onPress={handleGoogleSignIn}
                >
                    Sign up with Google
                </Button>
            </div>
            <div className="flex items-center gap-4 py-2">
                <Divider className="flex-1" />
                <p className="text-tiny  shrink-0">OR</p>
                <Divider className="flex-1" />
            </div>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <Input
                    isRequired
                    startContent={<Icons.userCircle className="!size-4" />}
                    label="Full Name"
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
                    label="Email Address"
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
                    label="Password"
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
                    label="Confirm Password"
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
                    color="primary"
                    type="submit"
                    size="lg"
                    isLoading={isSubmitting}
                    startContent={!isSubmitting && <Icons.shieldKey className="!size-6" />}
                >
                    Sign Up
                </Button>
            </form>
            <p className="text-small text-center">
                Already have an account?&nbsp;
                <Link href="/" size="sm">
                    Sign In
                </Link>
            </p>
        </div>
    );
}
